import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  PersonSimpleBikeIcon,
  PersonSimpleHikeIcon,
  BoatIcon,
  TrainIcon,
  BusIcon,
} from "@phosphor-icons/react";
import { pb } from "../../lib/pb";

const typeIconMap = {
  Bike: PersonSimpleBikeIcon,
  Hike: PersonSimpleHikeIcon,
  Ferry: BoatIcon,
  Train: TrainIcon,
  Bus: BusIcon,
};

const TripLayer = forwardRef(function TripLayer(
  {
    stages,
    clickedStage,
    setClickedStage,
    hoveredStage,
    setHoveredStage,
    selectedActivity,
    setSelectedActivity,
    fitBounds = true,
    paddingTopLeft = [20, 20],
    paddingBottomRight = [20, 20],
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

  const geoJSONCache = useRef(new Map());

  const activities = useMemo(() => {
    if (!stages?.length) return [];
    return stages.flatMap((stage) => stage.expand?.activities_via_stage ?? []);
  }, [stages]);

  const clickedStageRef = useRef(clickedStage);
  const hoveredStageRef = useRef(hoveredStage);
  const selectedActivityRef = useRef(selectedActivity);
  const hoveredActivityRef = useRef(null);

  const applyStageStyles = () => {
    const clickedStageValue = clickedStageRef.current;
    const hoveredStageValue = hoveredStageRef.current;
    const selectedActivityValue = selectedActivityRef.current;

    for (const [
      stageId,
      layerSets,
    ] of tripRef.current.layersByStage.entries()) {
      const isClicked = clickedStageValue === stageId;
      const isHovered = hoveredStageValue === stageId;

      for (const { outline, line, hit, marker, activityId } of layerSets) {
        const isSelectedActivity =
          isClicked && activityId === selectedActivityValue;
        const isHoveredActivity =
          isClicked && activityId === hoveredActivityRef.current;

        const lineOpacity = isClicked || isHovered ? 1 : 0.5;
        const outlineColor = isSelectedActivity
          ? "hsl(87, 77%, 47%)"
          : isHoveredActivity
            ? "#ddd"
            : "#fff";
        const outlineOpacity = isHoveredActivity ? 1 : 0.5;

        line.setStyle?.({ color: "green", opacity: lineOpacity, weight: 4 });
        outline.setStyle?.({
          color: outlineColor,
          opacity: outlineOpacity,
          weight: 8,
        });
        marker?.setOpacity(lineOpacity);

        if (
          isSelectedActivity ||
          (isClicked && selectedActivityValue == null)
        ) {
          outline.bringToFront?.();
          line.bringToFront?.();
          marker?.setZIndexOffset?.(6000);
          hit.bringToFront?.();
        } else {
          marker?.setZIndexOffset?.(5000);
        }
      }
    }
  };

  // Activity markers are just a decorative type icon at the midpoint of each
  // route — with many stages close together (or just zoomed out), they
  // overlap into a solid blob that hides the actual route lines. Rather than
  // a fixed zoom cutoff (which would either over-hide a short/sparse trip or
  // under-hide a long/dense one), hide a marker only when it's actually
  // close enough on screen to overlap a marker that's already showing, at
  // whatever the current zoom happens to be. The clicked stage's marker is
  // always kept visible so a selected/highlighted stage never disappears.
  const MIN_MARKER_SPACING_PX = 30;

  const declutterMarkers = () => {
    const clickedStageValue = clickedStageRef.current;

    const prioritized = [];
    const rest = [];
    for (const [stageId, layerSets] of tripRef.current.layersByStage.entries()) {
      for (const { marker } of layerSets) {
        if (!marker) continue;
        (stageId === clickedStageValue ? prioritized : rest).push(marker);
      }
    }

    const shownPoints = [];
    for (const marker of [...prioritized, ...rest]) {
      const point = map.latLngToContainerPoint(marker.getLatLng());
      const overlapsShown = shownPoints.some(
        (p) => Math.hypot(p.x - point.x, p.y - point.y) < MIN_MARKER_SPACING_PX,
      );
      const el = marker.getElement();
      if (overlapsShown) {
        el?.classList.add("activity-type-marker-hidden");
      } else {
        el?.classList.remove("activity-type-marker-hidden");
        shownPoints.push(point);
      }
    }
  };

  useEffect(() => {
    map.on("zoomend", declutterMarkers);
    map.on("moveend", declutterMarkers);
    return () => {
      map.off("zoomend", declutterMarkers);
      map.off("moveend", declutterMarkers);
    };
  }, [map]);

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

  useEffect(() => {
    selectedActivityRef.current = selectedActivity;
    applyStageStyles();
  }, [selectedActivity]);

  const fitStageBounds = (stageId) => {
    const bounds = tripRef.current.boundsByStage.get(stageId);
    if (!bounds?.isValid?.()) return false;

    map.fitBounds(bounds, {
      paddingTopLeft,
      paddingBottomRight,
      animate: true,
      duration: 0.5,
    });
    return true;
  };

  const fitAllBounds = () => {
    const bounds = tripRef.current.group.getBounds?.();
    if (!bounds?.isValid?.()) return false;

    map.fitBounds(bounds, {
      paddingTopLeft: [20, 20],
      paddingBottomRight: [20, 20],
      animate: true,
      duration: 0.5,
    });
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
          if (cancelled) return null;
          const file = activity.geoJSONSmall || activity.geoJSON;
          if (!file) return null;

          const cacheKey = `${activity.id}:${file}`;
          if (geoJSONCache.current.has(cacheKey)) {
            return { activity, data: geoJSONCache.current.get(cacheKey) };
          }

          const url = pb.files.getURL(activity, file);
          if (!url) return null;

          const res = await fetch(url);
          if (!res.ok) return null;

          const data = await res.json();
          geoJSONCache.current.set(cacheKey, data);
          return { activity, data };
        }),
      );

      if (cancelled) return;

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

        const coords = data.features?.[0]?.geometry?.coordinates;
        let marker = null;
        if (coords?.length) {
          const mid = coords[Math.floor(coords.length / 2)];
          const Icon = typeIconMap[activity.type];
          const iconHtml = Icon
            ? renderToStaticMarkup(
                React.createElement(Icon, {
                  size: 14,
                  color: "#fff",
                  weight: "bold",
                }),
              )
            : "";
          const divIcon = L.divIcon({
            className: "",
            html: `<div class="activity-type-marker">${iconHtml}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });
          marker = L.marker([mid[1], mid[0]], {
            icon: divIcon,
            interactive: false,
          });
        }

        if (!trip.layersByStage.has(activity.stage)) {
          trip.layersByStage.set(activity.stage, []);
        }
        trip.layersByStage.get(activity.stage).push({
          outline,
          line,
          hit,
          marker,
          activityId: activity.id,
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
            setSelectedActivity?.(activity.id);
            fitStageBounds(activity.stage);

            setTimeout(() => {
              trip.suppressNextMapClick = false;
            }, 0);
          });

          hitLayer.on("mouseover", () => {
            map.getContainer().style.cursor = "pointer";
            hoveredStageRef.current = activity.stage;
            setHoveredStage?.(activity.stage);
            if (clickedStageRef.current === activity.stage) {
              hoveredActivityRef.current = activity.id;
            }
            applyStageStyles();
          });

          hitLayer.on("mouseout", () => {
            map.getContainer().style.cursor = "";
            hoveredStageRef.current = null;
            setHoveredStage?.(null);
            hoveredActivityRef.current = null;
            applyStageStyles();
          });
        });

        outline.addTo(group);
        line.addTo(group);
        hit.addTo(group);
        marker?.addTo(group);
      }

      group.bringToFront();

      if (fitBounds && !trip.didInitialFit) {
        requestAnimationFrame(() => {
          map.invalidateSize();

          const bounds = tripRef.current.group.getBounds?.();
          if (bounds?.isValid?.()) {
            map.fitBounds(bounds, {
              paddingTopLeft: [20, 20],
              paddingBottomRight: [20, 20],
              animate: false,
            });
            trip.didInitialFit = true;
          }
          declutterMarkers();
        });
      } else {
        declutterMarkers();
      }

      applyStageStyles();
    };

    let cancelled = false;

    rebuildTripLayers();

    return () => {
      cancelled = true;
      const group = tripRef.current.group;
      group.clearLayers();
      if (map.hasLayer(group)) map.removeLayer(group);
    };
  }, [map, activities, fitBounds, setClickedStage, setHoveredStage]);

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
