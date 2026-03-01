import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { pb } from "../../lib/pb";

export default function PlannedRoute({ trip }) {
  const map = useMap();
  const groupRef = useRef(L.featureGroup());

  useEffect(() => {
    const group = groupRef.current;

    group.clearLayers();
    if (map.hasLayer(group)) map.removeLayer(group);

    const file = trip?.plannedTrip;
    if (!trip || !file) return;

    const url = pb.files.getURL(trip, file);
    if (!url) return;

    group.addTo(map);

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok)
          throw new Error(`Failed to fetch planned GeoJSON (${res.status})`);

        const data = await res.json();
        if (cancelled) return;

        const layer = L.geoJSON(data, {
          style: () => ({
            color: "black",
            weight: 2,
            opacity: 0.8,
            dashArray: "6 10",
          }),
        });

        layer.addTo(group);
      } catch (err) {
        console.warn("Planned GeoJSON load error:", url, err);
      }
    })();

    return () => {
      cancelled = true;
      group.clearLayers();
      if (map.hasLayer(group)) map.removeLayer(group);
    };
  }, [map, trip]);

  return null;
}
