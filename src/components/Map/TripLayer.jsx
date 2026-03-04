import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { pb } from "../../lib/pb";

const TripLayer = forwardRef(function TripLayer(
  {
    stages,
    clickedStage,
    setClickedStage,
    fitBounds = true,
    padding = [20, 20],
  },
  ref,
) {
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

  // Style all stage lines based on hovered/clicked state
  const applyStageStyles = () => {
    const selectedColor = cssVar("--p", "#ff6600");
    const unselectedColor = "green";
    const hoveredStage = hoveredStageRef.current;

    for (const [stageId, lines] of lineLayersByStageRef.current.entries()) {
      const isClicked = clickedStage === stageId;
      const isHovered = hoveredStage === stageId;

      const color = isClicked ? selectedColor : unselectedColor;
      const opacity = isHovered || isClicked ? 1 : 0.5;

      for (const line of lines) {
        line.setStyle?.({ color, opacity, weight: 4 });
        if (isClicked) line.bringToFront?.();
      }
    }
  };

  // Helper: fit bounds for a single stage
  const fitStageBounds = (stageId) => {
    const bounds = stageBoundsByIdRef.current.get(stageId);
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding });
    }
  };

  // Helper: fit bounds for whole trip (everything in the featureGroup)
  const fitAllBounds = () => {
    const group = groupRef.current;
    const bounds = group?.getBounds?.();
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding });
    }
  };

  // ✅ Expose methods to parent via ref (your button can call these)
  useImperativeHandle(
    ref,
    () => ({
      fitBounds: fitAllBounds,
      fitStageBounds,
      // optional: useful for debugging
      getBounds: () => groupRef.current?.getBounds?.(),
    }),
    // padding changes should update the behavior
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [map, padding],
  );

  // Extract activities when stages change
  useEffect(() => {
    if (!stages?.length) {
      setActivities([]);
      return;
    }

    const allActivities = stages.flatMap(
      (stage) => stage.expand?.activities_via_stage ?? [],
    );

    setActivities(allActivities);
  }, [stages]);

  // Build layers once per activities change
  useEffect(() => {
    const group = groupRef.current;
    group.clearLayers();
    group.addTo(map);

    lineLayersByStageRef.current.clear();
    stageBoundsByIdRef.current.clear();
    didInitialFitRef.current = false;

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
              existing ? existing.extend(activityBounds) : activityBounds,
            );
          }

          // interaction: hover highlights entire stage; click fits entire stage
          hit.eachLayer((hitLayer) => {
            hitLayer.on("click", (e) => {
              suppressNextMapClickRef.current = true;
              L.DomEvent.stopPropagation(e);

              setClickedStage?.(activity.stage);
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
        fitAllBounds();
        didInitialFitRef.current = true;
      }

      applyStageStyles();
    })();

    return () => {
      cancelled = true;
      group.clearLayers();
      if (map.hasLayer(group)) map.removeLayer(group);
    };
    // important: no clickedStage dependency; style handled below
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
});

export default TripLayer;
