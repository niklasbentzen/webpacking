import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import { fetchActivitiesForStages } from "../../lib/activities";
import {
  makeActivityRouteLayers,
  makePlannedTripGpxLayer,
} from "../../lib/gpxLayers";
import "./leaflet.css";
import s from "./TripMap.module.css";

function PlannedTripLayer({ trip }) {
  const map = useMap();
  const groupRef = useRef(L.featureGroup());

  useEffect(() => {
    const group = groupRef.current;
    group.clearLayers();
    if (map.hasLayer(group)) map.removeLayer(group);

    const layer = makePlannedTripGpxLayer(trip, "plannedTrip");
    if (!layer) return;

    group.addTo(map);

    layer.on("loaded", (e) => group.addLayer(e.target));
    layer.on("error", (err) => console.warn("Planned GPX load error:", err));

    return () => {
      group.clearLayers();
      if (map.hasLayer(group)) map.removeLayer(group);
    };
  }, [map, trip]);

  return null;
}

function StageLayers({ stages }) {
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
      try {
        const all = await fetchActivitiesForStages(stages);
        if (!cancelled) setActivities(all);
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

    const gpxActivities = activities.filter((a) => a.gpxFile);
    if (!gpxActivities.length) return;

    let loaded = 0;

    const maybeFit = () => {
      if (loaded >= gpxActivities.length) {
        const bounds = group.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
      }
    };

    for (const a of gpxActivities) {
      const stageSlug = stageSlugById.get(a.stage);
      if (!stageSlug) {
        loaded += 1;
        maybeFit();
        continue;
      }

      const color = a.type === "Hike" ? "green" : "blue";

      const parts = makeActivityRouteLayers(a, color);
      if (!parts) {
        loaded += 1;
        maybeFit();
        continue;
      }

      const { outline, line, hit, url } = parts;

      outline.on("loaded", (e) => group.addLayer(e.target));

      line.on("loaded", (e) => {
        loaded += 1;
        group.addLayer(e.target);
        maybeFit();
      });

      hit.on("loaded", (e) => {
        const hitLayer = e.target;

        hitLayer.on("click", () => navigate(`/stages/${stageSlug}`));

        hitLayer.on("mouseover", () => {
          map.getContainer().style.cursor = "pointer";
          line.setStyle?.({ weight: 4, opacity: 1 });
          outline.setStyle?.({ weight: 8, opacity: 1 });
        });

        hitLayer.on("mouseout", () => {
          map.getContainer().style.cursor = "";
          line.setStyle?.({ weight: 4, opacity: 0.5 });
          outline.setStyle?.({ weight: 8, opacity: 1 });
        });

        group.addLayer(hitLayer);
      });

      const onError = (err) => {
        console.warn("GPX load error:", url, err);
        loaded += 1;
        maybeFit();
      };

      outline.on("error", onError);
      line.on("error", onError);
      hit.on("error", onError);
    }

    return () => {
      group.clearLayers();
      map.removeLayer(group);
    };
  }, [map, navigate, activities, stageSlugById]);

  return null;
}

export default function TripMap({ stages, trip }) {
  return (
    <div className={s.mapContainer}>
      <MapContainer
        center={[56, 10]}
        zoom={4}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {trip?.plannedTrip && <PlannedTripLayer trip={trip} />}
        <StageLayers stages={stages} />
      </MapContainer>
    </div>
  );
}
