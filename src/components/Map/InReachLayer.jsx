import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { pb } from "../../lib/pb";

function formatLocalTime(timestamp, timezone) {
  const date = new Date(timestamp);
  const tz = timezone || "UTC";
  try {
    const parts = new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
      timeZoneName: "short",
      hour12: false,
    }).formatToParts(date);
    const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
    const abbr = get("timeZoneName");
    return `${get("day")} ${get("month")}, ${get("year")} - ${get("hour")}:${get("minute")} (${abbr})`;
  } catch {
    return date.toISOString().slice(0, 16).replace("T", " ") + " (UTC)";
  }
}

const InReachLayer = forwardRef(function InReachLayer({ limit = 500, onLastPoint }, ref) {
  const map = useMap();
  const lineGroupRef = useRef(L.featureGroup());
  const markerGroupRef = useRef(L.featureGroup());
  const pointsRef = useRef([]);
  const lastPointRef = useRef(null);
  const onLastPointRef = useRef(onLastPoint);
  useEffect(() => { onLastPointRef.current = onLastPoint; }, [onLastPoint]);

  // Expose public methods
  useImperativeHandle(ref, () => ({
    locate() {
      const last = lastPointRef.current;
      if (!last) return;

      map.flyTo([last.lat, last.lon], 12, {
        animate: true,
        duration: 0.2,
      });
    },

    fitToPoints() {
      if (!pointsRef.current.length) return;

      const bounds = L.latLngBounds(
        pointsRef.current.map((p) => [p.lat, p.lon]),
      );

      map.fitBounds(bounds, { padding: [20, 20] });
    },
  }));

  useEffect(() => {
    const lineGroup = lineGroupRef.current;
    const markerGroup = markerGroupRef.current;

    lineGroup.clearLayers();
    markerGroup.clearLayers();
    if (map.hasLayer(lineGroup)) map.removeLayer(lineGroup);
    if (map.hasLayer(markerGroup)) map.removeLayer(markerGroup);

    lineGroup.addTo(map);
    lineGroup.bringToBack();
    markerGroup.addTo(map);

    let cancelled = false;

    const redraw = () => {
      lineGroup.clearLayers();
      markerGroup.clearLayers();
      const pts = pointsRef.current;

      if (pts.length > 1) {
        L.polyline(
          pts.map((p) => [p.lat, p.lon]),
          {
            color: "red",
            weight: 6,
            opacity: 0.6,
          },
        ).addTo(lineGroup);
      }

      const last = lastPointRef.current ?? pts[pts.length - 1];
      if (!last) return;
      L.circleMarker([last.lat, last.lon], {
        radius: 7,
        weight: 2,
        color: "darkred",
        fillColor: "red",
        fillOpacity: 0.9,
      })
        .bindTooltip(
          last.timestamp
            ? formatLocalTime(last.timestamp, last.timezone)
            : "Unknown",
        )
        .addTo(markerGroup);
      markerGroup.bringToFront();
    };

    const pushPoint = (rec) => {
      const loc = rec.location;
      if (!loc || typeof loc.lat !== "number" || typeof loc.lon !== "number")
        return;

      const exists = pointsRef.current.some((p) => p.id === rec.id);
      if (exists) return;

      pointsRef.current.push({
        id: rec.id,
        lat: loc.lat,
        lon: loc.lon,
        timestamp: rec.timestamp,
        timezone: rec.timezone || "",
      });

      if (pointsRef.current.length > limit) {
        pointsRef.current = pointsRef.current.slice(-limit);
      }
    };

    const init = async () => {
      try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
          .toISOString()
          .replace("T", " ")
          .slice(0, 19);

        const [res, latestRes] = await Promise.all([
          pb.collection("inreach").getList(1, limit, {
            sort: "-timestamp",
            filter: `timestamp >= "${since}"`,
          }),
          pb.collection("inreach").getList(1, 1, { sort: "-timestamp" }),
        ]);

        if (cancelled) return;

        const latestItem = latestRes.items[0];
        if (latestItem?.location) {
          lastPointRef.current = {
            id: latestItem.id,
            lat: latestItem.location.lat,
            lon: latestItem.location.lon,
            timestamp: latestItem.timestamp,
            timezone: latestItem.timezone || "",
          };
          onLastPointRef.current?.({ timestamp: latestItem.timestamp, text: latestItem.raw?.Text ?? "" });
        }

        pointsRef.current = [];
        [...res.items].reverse().forEach(pushPoint);
        redraw();

        await pb.collection("inreach").subscribe("*", (e) => {
          if (e.action !== "create") return;
          const loc = e.record.location;
          if (loc?.lat != null && loc?.lon != null) {
            lastPointRef.current = {
              id: e.record.id,
              lat: loc.lat,
              lon: loc.lon,
              timestamp: e.record.timestamp,
              timezone: e.record.timezone || "",
            };
            onLastPointRef.current?.({ timestamp: e.record.timestamp, text: e.record.raw?.Text ?? "" });
          }
          const ts = e.record.timestamp ? new Date(e.record.timestamp) : null;
          if (ts && Date.now() - ts.getTime() > 24 * 60 * 60 * 1000) return;
          pushPoint(e.record);
          redraw();
        });
      } catch (err) {
        if (err?.status === 401) {
          pb.authStore.clear();
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      pb.collection("inreach")
        .unsubscribe("*")
        .catch(() => {});
      lineGroup.clearLayers();
      markerGroup.clearLayers();
      if (map.hasLayer(lineGroup)) map.removeLayer(lineGroup);
      if (map.hasLayer(markerGroup)) map.removeLayer(markerGroup);
    };
  }, [map, limit]);

  return null;
});

export default InReachLayer;
