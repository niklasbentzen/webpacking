import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { pb } from "../../lib/pb";

export default function StageLayers({
  stage,
  selectedActivity,
  setSelectedActivity,
  fitBounds = true,
  padding = [20, 20],
}) {
  const map = useMap();
  const groupRef = useRef(L.featureGroup());
  const didInitialFitRef = useRef(false);
  const suppressNextMapClickRef = useRef(false);

  const [activities, setActivities] = useState([]);
  const lineByActivityIdRef = useRef(new Map());

  const selectedActivityRef = useRef(null);
  useEffect(() => {
    selectedActivityRef.current = selectedActivity ?? null;
  }, [selectedActivity]);

  const pendingFitIdRef = useRef(null);

  const cssVar = (name, fallback) => {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    return v || fallback;
  };

  const fitToActivity = (activityId) => {
    if (!activityId) return false;
    const line = lineByActivityIdRef.current.get(activityId);
    if (!line) return false;

    const bounds = line.getBounds?.();
    if (!bounds || !bounds.isValid?.()) return false;

    map.fitBounds(bounds, {
      paddingTopLeft: [4, 4],
      paddingBottomRight: [4, 200],
    });

    return true;
  };

  const applySelectionStyles = (selectedId) => {
    const selectedColor = cssVar("--p", "#ff6600");
    const unselectedColor = "green";

    for (const [activityId, line] of lineByActivityIdRef.current.entries()) {
      const isSelected = activityId === selectedId;
      line.setStyle?.({
        color: isSelected ? selectedColor : unselectedColor,
        opacity: isSelected ? 1 : 0.5,
      });
      if (isSelected) line.bringToFront?.();
    }
  };

  useEffect(() => {
    if (!stage) {
      setActivities([]);
      return;
    }
    setActivities(stage.expand?.activities_via_stage ?? []);
  }, [stage]);

  useEffect(() => {
    const group = groupRef.current;
    group.clearLayers();
    group.addTo(map);

    didInitialFitRef.current = false;
    lineByActivityIdRef.current.clear();

    const unselectedColor = "green";
    let cancelled = false;

    (async () => {
      for (const activity of activities) {
        const file = activity.geoJSON || activity.geoJSONSmall;
        if (!file) continue;

        const url = pb.files.getURL(activity, file);
        if (!url) continue;

        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`GeoJSON fetch failed (${res.status})`);
          const data = await res.json();
          if (cancelled) return;

          const outline = L.geoJSON(data, {
            style: () => ({ color: "#ffffff", weight: 8, opacity: 1 }),
          });

          const line = L.geoJSON(data, {
            style: () => ({ color: unselectedColor, weight: 4, opacity: 0.5 }),
          });

          lineByActivityIdRef.current.set(activity.id, line);

          applySelectionStyles(selectedActivityRef.current);

          if (pendingFitIdRef.current === activity.id) {
            fitToActivity(activity.id);
            pendingFitIdRef.current = null;
          }

          const hit = L.geoJSON(data, {
            style: () => ({ color: "#000", weight: 22, opacity: 0 }),
          });

          hit.eachLayer((hitLayer) => {
            hitLayer.on("click", (e) => {
              suppressNextMapClickRef.current = true;
              L.DomEvent.stopPropagation(e);

              setSelectedActivity?.(activity.id);

              setTimeout(() => {
                suppressNextMapClickRef.current = false;
              }, 0);
            });

            hitLayer.on("mouseover", () => {
              map.getContainer().style.cursor = "pointer";
              line.setStyle?.({ opacity: 1 });
            });

            hitLayer.on("mouseout", () => {
              map.getContainer().style.cursor = "";
              const isSelected = selectedActivityRef.current === activity.id;
              line.setStyle?.({ opacity: isSelected ? 1 : 0.5 });
            });
          });

          outline.addTo(group);
          line.addTo(group);
          line.bringToFront?.();
          hit.addTo(group);
        } catch (e) {
          console.warn("Failed to load GeoJSON:", url, e);
        }
      }

      if (fitBounds && !didInitialFitRef.current) {
        const bounds = group.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, {
            paddingTopLeft: [padding[0], padding[1]],
            paddingBottomRight: [padding[0], 200],
          });
          didInitialFitRef.current = true;
        }
      }
    })();

    return () => {
      cancelled = true;
      group.clearLayers();
      if (map.hasLayer(group)) map.removeLayer(group);
      lineByActivityIdRef.current.clear();
    };
  }, [map, activities, fitBounds, padding]);

  useEffect(() => {
    applySelectionStyles(selectedActivity ?? null);

    if (selectedActivity) {
      const didFit = fitToActivity(selectedActivity);
      pendingFitIdRef.current = didFit ? null : selectedActivity;
    } else {
      pendingFitIdRef.current = null;
    }
  }, [selectedActivity]);

  useEffect(() => {
    if (!setSelectedActivity) return;

    const onMapClick = () => {
      if (suppressNextMapClickRef.current) return;
      setSelectedActivity(null);
    };

    map.on("click", onMapClick);
    return () => map.off("click", onMapClick);
  }, [map, setSelectedActivity]);

  return null;
}
