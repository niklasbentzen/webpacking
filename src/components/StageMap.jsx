import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet-gpx";
import { pb } from "../lib/pb";

function GPXClickableLayers({ stages }) {
  const map = useMap();
  const navigate = useNavigate();
  const groupRef = useRef(L.featureGroup());
  const [activities, setActivities] = useState([]);

  const stageSlugById = useMemo(() => {
    const m = new Map();
    for (const s of stages) m.set(s.id, s.slug);
    return m;
  }, [stages]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!stages?.length) {
        setActivities([]);
        return;
      }

      try {
        const allActivities = [];

        for (const stage of stages) {
          const res = await pb.collection("activities").getFullList({
            filter: `stage = '${stage.id}'`,
            sort: "startTime",
          });

          allActivities.push(...res);
        }

        if (!cancelled) {
          setActivities(allActivities);
        }
      } catch (e) {
        console.warn("Map activity fetch error:", e);
        if (!cancelled) setActivities([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [stages]);

  useEffect(() => {
    const group = groupRef.current;
    group.clearLayers();
    group.addTo(map);

    if (!activities.length) return;

    let loaded = 0;

    for (const a of activities) {
      if (!a.gpxFile) continue;

      const stageSlug = stageSlugById.get(a.stage);
      if (!stageSlug) continue;

      const url = pb.files.getURL(a, a.gpxFile);

      let color;
      switch (a.type) {
        case "Bike":
          color = "blue";
          break;
        case "Hike":
          color = "green";
          break;
      }

      const gpx = new L.GPX(url, {
        async: true,
        polyline_options: {
          color: color || "black",
          weight: 4,
          opacity: 1,
        },
        marker_options: {
          startIconUrl: null,
          endIconUrl: null,
          shadowUrl: null,
          wptIconUrls: {},
        },
      });

      gpx.on("loaded", (e) => {
        loaded += 1;

        // Click anywhere on this GPX line -> go to stage
        e.target.on("click", () => navigate(`/stages/${stageSlug}`));

        group.addLayer(e.target);

        // Fit bounds after all GPX have loaded
        if (loaded >= activities.filter((x) => x.gpxFile).length) {
          const bounds = group.getBounds();
          if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
        }
      });

      gpx.on("error", (err) => {
        console.warn("GPX load error:", url, err);
      });
    }

    return () => {
      group.clearLayers();
      map.removeLayer(group);
    };
  }, [map, navigate, activities, stageSlugById]);

  return null;
}

export default function StageMap({ stages }) {
  return (
    <div style={{ height: 520, borderRadius: 4, overflow: "hidden" }}>
      <MapContainer
        center={[56, 10]}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <GPXClickableLayers stages={stages} />
      </MapContainer>
    </div>
  );
}
