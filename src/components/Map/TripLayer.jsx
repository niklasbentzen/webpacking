import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { pb } from "../../lib/pb";

const PADDING = [20, 20];

const TripLayer = forwardRef(function TripLayer(
  {
    stages,
    clickedStage,
    setClickedStage,
    hoveredStage,
    setHoveredStage,
    fitBounds = true,
  },
  ref,
) {
  const map = useMap();

  const tripRef = useRef({
    group: L.featureGroup(),
    layersByStage: new Map(),
    boundsByStage: new Map(),
    suppressNextMapClick: false,
    didInitialFit: false,
  });

  const activities = useMemo(() => {
    if (!stages?.length) return [];
    return stages.flatMap((stage) => stage.expand?.activities_via_stage ?? []);
  }, [stages]);

  const clickedStageRef = useRef(clickedStage);
  const hoveredStageRef = useRef(hoveredStage);

  const applyStageStyles = () => {
    const selectedColor = "green";
    const unselectedColor = "green";

    const clickedStageValue = clickedStageRef.current;
    const hoveredStageValue = hoveredStageRef.current;

    for (const [
      stageId,
      layerSets,
    ] of tripRef.current.layersByStage.entries()) {
      const isClicked = clickedStageValue === stageId;
      const isHovered = hoveredStageValue === stageId;

      const color = isClicked ? selectedColor : unselectedColor;
      const opacity = isHovered || isClicked ? 1 : 0.5;

      for (const { outline, line, hit } of layerSets) {
        line.setStyle?.({ color, opacity, weight: 4 });

        if (isClicked) {
          outline.bringToFront?.();
          line.bringToFront?.();
          hit.bringToFront?.();
        }
      }
    }
  };

  useEffect(() => {
    clickedStageRef.current = clickedStage;

    if (clickedStageRef.current != null) {
      fitStageBounds(clickedStageRef.current);
    }

    applyStageStyles();
  }, [clickedStage]);

  useEffect(() => {
    hoveredStageRef.current = hoveredStage;
    applyStageStyles();
  }, [hoveredStage]);

  const fitStageBounds = (stageId) => {
    const bounds = tripRef.current.boundsByStage.get(stageId);
    if (!bounds?.isValid?.()) return false;

    map.fitBounds(bounds, { padding: PADDING });
    return true;
  };

  const fitAllBounds = () => {
    const bounds = tripRef.current.group.getBounds?.();
    if (!bounds?.isValid?.()) return false;

    map.fitBounds(bounds, { padding: PADDING });
    return true;
  };

  useImperativeHandle(
    ref,
    () => ({
      fitBounds: fitAllBounds,
      fitStageBounds,
      getBounds: () => tripRef.current.group.getBounds?.(),
    }),
    [map],
  );

  useEffect(() => {
    const rebuildTripLayers = async () => {
      const trip = tripRef.current;
      const group = trip.group;

      group.clearLayers();
      group.addTo(map);

      trip.layersByStage.clear();
      trip.boundsByStage.clear();

      const results = await Promise.all(
        activities.map(async (activity) => {
          const file = activity.geoJSONSmall || activity.geoJSON;
          if (!file) return null;

          const url = pb.files.getURL(activity, file);
          if (!url) return null;

          const res = await fetch(url);
          if (!res.ok) return null;

          const data = await res.json();
          return { activity, data };
        }),
      );

      for (const result of results) {
        if (!result) continue;

        const { activity, data } = result;

        const outline = L.geoJSON(data, {
          style: () => ({ color: "#fff", weight: 8, opacity: 1 }),
        });

        const line = L.geoJSON(data, {
          style: () => ({ color: "green", weight: 4, opacity: 0.5 }),
        });

        const hit = L.geoJSON(data, {
          style: () => ({ color: "#000", weight: 22, opacity: 0 }),
        });

        if (!trip.layersByStage.has(activity.stage)) {
          trip.layersByStage.set(activity.stage, []);
        }
        trip.layersByStage.get(activity.stage).push({
          outline,
          line,
          hit,
        });

        const bounds = line.getBounds();
        if (bounds?.isValid?.()) {
          const prev = trip.boundsByStage.get(activity.stage);
          trip.boundsByStage.set(
            activity.stage,
            prev ? prev.extend(bounds) : bounds,
          );
        }

        hit.eachLayer((hitLayer) => {
          hitLayer.on("click", (e) => {
            trip.suppressNextMapClick = true;
            L.DomEvent.stopPropagation(e);

            setClickedStage?.(activity.stage);
            fitStageBounds(activity.stage);

            setTimeout(() => {
              trip.suppressNextMapClick = false;
            }, 0);
          });

          hitLayer.on("mouseover", () => {
            map.getContainer().style.cursor = "pointer";
            hoveredStageRef.current = activity.stage;
            setHoveredStage?.(activity.stage);
            console.log(activity.stage, "is hovered");
            applyStageStyles();
          });

          hitLayer.on("mouseout", () => {
            map.getContainer().style.cursor = "";
            hoveredStageRef.current = null;
            setHoveredStage?.(null);
            applyStageStyles();
          });
        });

        outline.addTo(group);
        line.addTo(group);
        hit.addTo(group);
      }

      if (fitBounds && !trip.didInitialFit) {
        requestAnimationFrame(() => {
          map.invalidateSize();

          const didFit = fitAllBounds();
          if (didFit) {
            trip.didInitialFit = true;
          }
        });
      }

      applyStageStyles();
    };

    let cancelled = false;

    const run = async () => {
      await rebuildTripLayers();
      if (cancelled) return;
    };

    run();

    return () => {
      cancelled = true;
      const group = tripRef.current.group;
      group.clearLayers();
      if (map.hasLayer(group)) map.removeLayer(group);
    };
  }, [map, activities, fitBounds, setClickedStage, setHoveredStage]);

  useEffect(() => {
    applyStageStyles();

    if (clickedStageRef.current != null) {
      fitStageBounds(clickedStageRef.current);
    }
  }, [clickedStage]);

  useEffect(() => {
    if (!setClickedStage && !setHoveredStage) return;

    const onMapClick = () => {
      if (tripRef.current.suppressNextMapClick) return;

      setClickedStage?.(null);
      setHoveredStage?.(null);

      hoveredStageRef.current = null;
      map.getContainer().style.cursor = "";
      applyStageStyles();
    };

    map.on("click", onMapClick);
    return () => map.off("click", onMapClick);
  }, [map, setClickedStage, setHoveredStage]);

  return null;
});

export default TripLayer;
