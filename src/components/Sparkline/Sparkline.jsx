import { useEffect, useMemo, useRef } from "react";
import { MapContainer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-gpx";
import { pb } from "../../lib/pb";

function RouteLayers({ items }) {
  const map = useMap();
  const groupRef = useRef(L.featureGroup());
  const loadedRef = useRef(0);

  useEffect(() => {
    const group = groupRef.current;
    group.clearLayers();
    group.addTo(map);
    loadedRef.current = 0;

    if (!items?.length) return;

    const total = items.length;
    let cancelled = false;

    const maybeFit = () => {
      if (loadedRef.current >= total) {
        const bounds = group.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [0, 0] });
      }
    };

    for (const item of items) {
      if (item.kind === "gpx") {
        const gpx = new L.GPX(item.url, {
          async: true,
          polyline_options: {
            weight: 2,
            opacity: 1,
            color: "var(--p)",
          },
          markers: {
            startIcon: null,
            endIcon: null,
            shadowUrl: null,
          },
        });

        gpx.on("loaded", (e) => {
          if (cancelled) return;
          loadedRef.current += 1;
          group.addLayer(e.target);
          maybeFit();
        });

        gpx.on("error", () => {
          if (cancelled) return;
          loadedRef.current += 1;
          maybeFit();
        });

        continue;
      }

      // GeoJSON / GeoJSONSmall
      fetch(item.url)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return;

          const layer = L.geoJSON(data, {
            style: () => ({
              color: "var(--p)",
              weight: 2,
              opacity: 1,
            }),
          });

          group.addLayer(layer);

          loadedRef.current += 1;
          maybeFit();
        })
        .catch(() => {
          if (cancelled) return;
          loadedRef.current += 1;
          maybeFit();
        });
    }

    return () => {
      cancelled = true;
      group.clearLayers();
      map.removeLayer(group);
    };
  }, [map, items]);

  return null;
}

export default function Sparkline({ activities, width = 60, height = 60 }) {
  const items = useMemo(() => {
    const out = [];

    for (const a of activities || []) {
      // Prefer geoJSONSmall -> geoJSON -> gpxFile
      const geoFile = a.geoJSONSmall || a.geoJSON;
      if (geoFile) {
        out.push({ kind: "geojson", url: pb.files.getURL(a, geoFile) });
        continue;
      }

      if (a.gpxFile) {
        out.push({ kind: "gpx", url: pb.files.getURL(a, a.gpxFile) });
      }
    }

    return out.filter((x) => x.url);
  }, [activities]);

  if (!items.length) return null;

  return (
    <div style={{ width, height, background: "transparent" }}>
      <MapContainer
        center={[0, 0]}
        zoom={1}
        style={{
          width: "100%",
          height: "100%",
          background: "transparent",
          cursor: "default",
        }}
        dragging={false}
        zoomControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        attributionControl={false}
      >
        <RouteLayers items={items} />
      </MapContainer>
    </div>
  );
}
