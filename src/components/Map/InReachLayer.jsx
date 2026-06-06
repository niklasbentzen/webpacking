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

const InReachLayer = forwardRef(function InReachLayer({ limit = 500 }, ref) {
  const map = useMap();
  const groupRef = useRef(L.featureGroup());
  const pointsRef = useRef([]);
  const lastPointRef = useRef(null);

  // Expose public methods
  useImperativeHandle(ref, () => ({
    locate() {
      const last = lastPointRef.current;
      if (!last) return;

      map.flyTo([last.lat, last.lon], 8, {
        animate: true,
        duration: 0.2,
      });
    },

    fitToPoints() {
      if (!pointsRef.current.length) return;

      const bounds = L.latLngBounds(
        pointsRef.current.map((p) => [p.lat, p.lon]),
      );

      map.fitBounds(bounds, { padding: [100, 100] });
    },
  }));

  useEffect(() => {
    const group = groupRef.current;
    group.clearLayers();
    if (map.hasLayer(group)) map.removeLayer(group);
    group.addTo(map);

    let cancelled = false;

    const redraw = () => {
      group.clearLayers();
      const pts = pointsRef.current;

      if (pts.length > 1) {
        L.polyline(
          pts.map((p) => [p.lat, p.lon]),
          {
            color: "red",
            weight: 2,
            opacity: 0.7,
          },
        ).addTo(group);
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
        .addTo(group);
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
      group.clearLayers();
      if (map.hasLayer(group)) map.removeLayer(group);
    };
  }, [map, limit]);

  return null;
});

export default InReachLayer;
