import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-gpx";

function GPXLayer({ urls }) {
  const map = useMap();
  const groupRef = useRef(L.featureGroup());

  useEffect(() => {
    const group = groupRef.current;
    group.clearLayers();
    group.addTo(map);

    if (!urls?.length) return;

    let loaded = 0;

    urls.forEach((url) => {
      // leaflet-gpx plugin: loads and parses GPX, then adds to map as a layer
      const gpx = new L.GPX(url, {
        async: true,
        polyline_options: {
          weight: 4,
          opacity: 0.9,
        },
        marker_options: {
          startIconUrl: null,
          endIconUrl: null,
          shadowUrl: null,
        },
      });

      gpx.on("loaded", (e) => {
        loaded += 1;
        group.addLayer(e.target);

        // After all files load, fit bounds once
        if (loaded === urls.length) {
          const bounds = group.getBounds();
          if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
        }
      });

      gpx.on("error", (err) => {
        // If one GPX fails, we still want the map to work
        // eslint-disable-next-line no-console
        console.warn("GPX load error:", url, err);
        loaded += 1;
      });
    });

    return () => {
      group.clearLayers();
      map.removeLayer(group);
    };
  }, [map, urls]);

  return null;
}

export default function TripMap({ gpxUrls }) {
  const urls = useMemo(() => gpxUrls?.filter(Boolean) ?? [], [gpxUrls]);

  return (
    <div style={{ height: 420, borderRadius: 12, overflow: "hidden" }}>
      <MapContainer
        center={[0, 0]}
        zoom={2}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <GPXLayer urls={urls} />
      </MapContainer>
    </div>
  );
}
