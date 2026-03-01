import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { pb } from "../../lib/pb";

const InReachLayer = forwardRef(function InReachLayer({ limit = 10 }, ref) {
  const map = useMap();
  const groupRef = useRef(L.featureGroup());
  const pointsRef = useRef([]);

  // Expose public methods
  useImperativeHandle(ref, () => ({
    locate() {
      const last = pointsRef.current[pointsRef.current.length - 1];
      if (!last) return;

      map.flyTo([last.lat, last.lon], 8, {
        animate: true,
        duration: 0.2,
      });
    },

    fitToPoints() {
      if (!pointsRef.current.length) return;

      const bounds = L.latLngBounds(
        pointsRef.current.map((p) => [p.lat, p.lon])
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
      for (const p of pointsRef.current) {
        const dot = L.circleMarker([p.lat, p.lon], {
          radius: 6,
          weight: 2,
          color: "red",
          fillColor: "red",
          fillOpacity: 0.5,
        });

        dot.bindTooltip(
          p.timestamp ? new Date(p.timestamp).toLocaleString() : "Unknown"
        );

        dot.addTo(group);
      }
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
      });

      if (pointsRef.current.length > limit) {
        pointsRef.current = pointsRef.current.slice(-limit);
      }
    };

    const init = async () => {
      const res = await pb.collection("inreach").getList(1, limit, {
        sort: "-timestamp",
      });

      if (cancelled) return;

      pointsRef.current = [];
      [...res.items].reverse().forEach(pushPoint);
      redraw();

      await pb.collection("inreach").subscribe("*", (e) => {
        if (e.action !== "create") return;
        pushPoint(e.record);
        redraw();
      });
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
