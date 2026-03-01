// ✅ Copy/paste this whole file (same as before, but click fitBounds now fits ENTIRE STAGE)
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { pb } from "../../lib/pb";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function PlannedLayer({ trip }) {
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

function StageLayers({
  stages,
  clickedStage,
  setClickedStage,
  fitBounds = true,
  padding = [20, 20],
}) {
  const map = useMap();
  const groupRef = useRef(L.featureGroup());
  const suppressNextMapClickRef = useRef(false);
  const didInitialFitRef = useRef(false);

  // stageId -> array of line layers for that stage
  const lineLayersByStageRef = useRef(new Map());

  // stageId -> L.LatLngBounds for that stage
  const stageBoundsByIdRef = useRef(new Map());

  const hoveredStageRef = useRef(null);
  const [activities, setActivities] = useState([]);

  const cssVar = (name, fallback) => {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    return v || fallback;
  };

  // Extract activities when stages change
  useEffect(() => {
    if (!stages?.length) {
      setActivities([]);
      return;
    }

    const allActivities = stages.flatMap(
      (stage) => stage.expand?.activities_via_stage ?? []
    );

    setActivities(allActivities);
  }, [stages]);

  // Style all stage lines based on hovered/clicked state
  const applyStageStyles = () => {
    const selectedColor = cssVar("--p");
    const unselectedColor = "green";

    const hoveredStage = hoveredStageRef.current;

    for (const [stageId, lines] of lineLayersByStageRef.current.entries()) {
      const isClicked = clickedStage === stageId;
      const isHovered = hoveredStage === stageId;

      const color = isClicked ? selectedColor : unselectedColor;
      const opacity = isHovered || isClicked ? 1 : 0.5;
      const weight = isHovered || isClicked ? 4 : 4;

      for (const line of lines) {
        line.setStyle?.({ color, opacity, weight });
      }
    }
  };

  // Helper: fit bounds for the whole stage
  const fitStageBounds = (stageId) => {
    const bounds = stageBoundsByIdRef.current.get(stageId);
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding });
    }
  };

  // Build layers once per activities change
  useEffect(() => {
    const group = groupRef.current;
    group.clearLayers();
    group.addTo(map);

    lineLayersByStageRef.current.clear();
    stageBoundsByIdRef.current.clear();

    let cancelled = false;

    (async () => {
      for (const activity of activities) {
        if (!activity?.geoJSONSmall && !activity?.geoJSON) continue;

        const file = activity.geoJSONSmall || activity.geoJSON;
        const url = pb.files.getURL(activity, file);
        if (!url) continue;

        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Failed to fetch GeoJSON ${res.status}`);
          const data = await res.json();
          if (cancelled) return;

          const outline = L.geoJSON(data, {
            style: () => ({ color: "#ffffff", weight: 8, opacity: 1 }),
          });

          const line = L.geoJSON(data, {
            style: () => ({ color: "green", weight: 4, opacity: 0.5 }),
          });

          const hit = L.geoJSON(data, {
            style: () => ({ color: "#000", weight: 22, opacity: 0 }),
          });

          // register line under stage id
          if (!lineLayersByStageRef.current.has(activity.stage)) {
            lineLayersByStageRef.current.set(activity.stage, []);
          }
          lineLayersByStageRef.current.get(activity.stage).push(line);

          // accumulate stage bounds (union of all activity bounds)
          const activityBounds = line.getBounds();
          if (activityBounds?.isValid?.()) {
            const existing = stageBoundsByIdRef.current.get(activity.stage);
            stageBoundsByIdRef.current.set(
              activity.stage,
              existing ? existing.extend(activityBounds) : activityBounds
            );
          }

          // interaction: hover highlights entire stage; click fits entire stage
          hit.eachLayer((hitLayer) => {
            hitLayer.on("click", (e) => {
              suppressNextMapClickRef.current = true;
              L.DomEvent.stopPropagation(e);

              setClickedStage?.(activity.stage);

              // ✅ Fit ENTIRE STAGE (all activities), not just this activity
              fitStageBounds(activity.stage);

              setTimeout(() => {
                suppressNextMapClickRef.current = false;
              }, 0);
            });

            hitLayer.on("mouseover", () => {
              map.getContainer().style.cursor = "pointer";
              hoveredStageRef.current = activity.stage;
              applyStageStyles();
            });

            hitLayer.on("mouseout", () => {
              map.getContainer().style.cursor = "";
              hoveredStageRef.current = null;
              applyStageStyles();
            });
          });

          outline.addTo(group);
          line.addTo(group);
          hit.addTo(group);
        } catch (e) {
          console.warn("Failed to load GeoJSON:", url, e);
        }
      }

      // initial fit (whole group)
      if (fitBounds && !didInitialFitRef.current) {
        const bounds = group.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding });
          didInitialFitRef.current = true;
        }
      }

      applyStageStyles();
    })();

    return () => {
      cancelled = true;
      group.clearLayers();
      if (map.hasLayer(group)) map.removeLayer(group);
    };
    // IMPORTANT: no clickedStage here; styling handled below
  }, [map, activities, fitBounds, padding, setClickedStage]);

  // Re-apply styles when clickedStage changes (no rebuild)
  useEffect(() => {
    applyStageStyles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clickedStage]);

  // Click blank map to clear selection
  useEffect(() => {
    if (!setClickedStage) return;

    const onMapClick = () => {
      if (suppressNextMapClickRef.current) return;
      setClickedStage(null);
    };

    map.on("click", onMapClick);
    return () => map.off("click", onMapClick);
  }, [map, setClickedStage]);

  return null;
}

export default function TripMap({
  stages = [],
  trip,
  clickedStage,
  setClickedStage,
}) {
  return (
    <div style={{ height: "100%", borderRadius: 10, overflow: "hidden" }}>
      <MapContainer
        center={[56, 10]}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {trip && <PlannedLayer trip={trip} />}

        <StageLayers
          stages={stages}
          clickedStage={clickedStage}
          setClickedStage={setClickedStage}
          fitBounds={true}
          padding={[20, 20]}
        />
      </MapContainer>
    </div>
  );
}
