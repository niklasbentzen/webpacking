import { useEffect, useMemo, useRef } from "react";
import { MapContainer, useMap } from "react-leaflet";
import L, { markers } from "leaflet";
import "leaflet-gpx";
import { pb } from "../../lib/pb";

function GPXLines({ urls }) {
  const map = useMap();
  const groupRef = useRef(L.featureGroup());
  const loadedRef = useRef(0);

  useEffect(() => {
    const group = groupRef.current;
    group.clearLayers();
    group.addTo(map);
    loadedRef.current = 0;

    if (!urls?.length) return;

    urls.forEach((url) => {
      const gpx = new L.GPX(url, {
        async: true,
        polyline_options: {
          weight: 2,
          opacity: 1,
          color: "#000",
        },
        markers: {
          startIcon: null,
          endIcon: null,
          shadowUrl: null,
        },
      });

      gpx.on("loaded", (e) => {
        loadedRef.current += 1;
        group.addLayer(e.target);

        if (loadedRef.current === urls.length) {
          const bounds = group.getBounds();
          if (bounds.isValid()) map.fitBounds(bounds, { padding: [2, 2] });
        }
      });

      gpx.on("error", () => {
        loadedRef.current += 1;
      });
    });

    return () => {
      group.clearLayers();
      map.removeLayer(group);
    };
  }, [map, urls]);

  return null;
}

export default function Sparkline({ activities, width = 80, height = 40 }) {
  const gpxURLs = useMemo(() => {
    const urls = [];
    for (const a of activities || []) {
      if (a.gpxFile) urls.push(pb.files.getURL(a, a.gpxFile));
    }
    return urls;
  }, [activities]);

  if (!gpxURLs.length) return null;

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
        <GPXLines urls={gpxURLs} />
      </MapContainer>
    </div>
  );
}
