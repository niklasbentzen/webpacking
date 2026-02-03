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
import { pb } from "../../lib/pb";

function PlannedLayer({ trip }) {
  const map = useMap();
  const groupRef = useRef(L.featureGroup());

  useEffect(() => {
    const group = groupRef.current;
    group.clearLayers();
    if (map.hasLayer(group)) map.removeLayer(group);

    const file = trip?.plannedTrip;
    if (!trip || !file) return null;

    const url = pb.files.getURL(trip, file);
    console.log("Planned trip GPX URL:", url);

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

function StageLayers({ stages, setClickedStage, clickedStage }) {
  const map = useMap();
  const navigate = useNavigate();
  const groupRef = useRef(L.featureGroup());
  const suppressMapClickRef = useRef(false);
  const [activities, setActivities] = useState([]);

  // ✅ stageId -> array of line layers (because a stage can have multiple activities)
  const lineLayersByStageRef = useRef(new Map());

  useEffect(() => {
    const onMapClick = () => {
      if (suppressMapClickRef.current) return;
      setClickedStage?.(null);
    };

    map.on("click", onMapClick);
    return () => map.off("click", onMapClick);
  }, [map, setClickedStage]);

  const stageSlugById = useMemo(() => {
    const m = new Map();
    for (const s of stages) m.set(s.id, s.slug);
    return m;
  }, [stages]);

  useEffect(() => {
    async function loadActivities() {
      try {
        const all = await fetchActivitiesForStages(stages);
        setActivities(all);
      } catch (e) {
        console.warn("Map activity fetch error:", e);
        setActivities([]);
      }
    }

    if (stages?.length) loadActivities();
    else setActivities([]);
  }, [stages]);

  // ✅ Apply highlight styling WITHOUT reloading GPX
  useEffect(() => {
    const m = lineLayersByStageRef.current;

    for (const [stageId, layers] of m.entries()) {
      const isSelected = clickedStage && stageId === clickedStage;

      for (const lineLayer of layers) {
        lineLayer.setStyle?.({
          opacity: isSelected ? 1 : 0.5,
        });
      }
    }
  }, [clickedStage]);

  useEffect(() => {
    const group = groupRef.current;
    group.clearLayers();
    group.addTo(map);

    // ✅ reset registry whenever we rebuild layers
    lineLayersByStageRef.current.clear();

    const gpxActivities = activities.filter((a) => a.gpxFile);
    if (!gpxActivities.length) return;

    let loaded = 0;

    const maybeFit = () => {
      if (loaded >= gpxActivities.length) {
        const bounds = group.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
      }
    };

    for (const activity of gpxActivities) {
      const stageSlug = stageSlugById.get(activity.stage);
      if (!stageSlug) {
        loaded += 1;
        maybeFit();
        continue;
      }

      const color = activity.type === "Hike" ? "green" : "blue";

      if (!activity?.gpxFile) continue;

      const url = pb.files.getURL(activity, activity.gpxFile);

      const outline = new L.GPX(url, {
        async: true,
        polyline_options: { color: "#ffffff", weight: 8, opacity: 1 },
        markers: {
          startIcon: null,
          endIcon: null,
          shadowUrl: null,
          wptIconUrls: {},
        },
      });

      const line = new L.GPX(url, {
        async: true,
        polyline_options: {
          color,
          weight: 4,
          opacity: 0.5,
        },
        markers: {
          startIcon: null,
          endIcon: null,
          shadowUrl: null,
          wptIconUrls: {},
        },
      });

      const hit = new L.GPX(url, {
        async: true,
        polyline_options: { color: "#000", weight: 20, opacity: 0 },
        markers: {
          startIcon: null,
          endIcon: null,
          shadowUrl: null,
          wptIconUrls: {},
        },
      });

      outline.on("loaded", (e) => group.addLayer(e.target));

      line.on("loaded", (e) => {
        loaded += 1;
        group.addLayer(e.target);

        // ✅ register this line layer under its stage id
        if (!lineLayersByStageRef.current.has(activity.stage)) {
          lineLayersByStageRef.current.set(activity.stage, []);
        }
        lineLayersByStageRef.current.get(activity.stage).push(e.target);

        // ✅ apply correct style immediately (in case clickedStage already set)
        const isSelected = clickedStage && clickedStage === activity.stage;
        e.target.setStyle?.({ opacity: isSelected ? 1 : 0.5 });

        maybeFit();
      });

      hit.on("loaded", (e) => {
        const hitLayer = e.target;

        hitLayer.on("click", () => {
          suppressMapClickRef.current = true;
          setClickedStage?.(activity.stage);

          setTimeout(() => {
            suppressMapClickRef.current = false;
          }, 0);
        });

        hitLayer.on("mouseover", () => {
          map.getContainer().style.cursor = "pointer";
          // keep your hover "pop"
          line.setStyle?.({ weight: 4, opacity: 1 });
          outline.setStyle?.({ weight: 8, opacity: 1 });
        });

        hitLayer.on("mouseout", () => {
          map.getContainer().style.cursor = "";

          // restore based on selection (not always 0.5)
          const isSelected = clickedStage && clickedStage === activity.stage;
          line.setStyle?.({ weight: 4, opacity: isSelected ? 1 : 0.5 });
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
      lineLayersByStageRef.current.clear();
    };
  }, [map, navigate, activities, stageSlugById]);

  return null;
}

export default function TripMap({
  stages,
  trip,
  setClickedStage,
  clickedStage,
}) {
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
        <StageLayers
          stages={stages}
          setClickedStage={setClickedStage}
          clickedStage={clickedStage}
        />
      </MapContainer>
    </div>
  );
}
