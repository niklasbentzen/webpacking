import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { pb } from "../../lib/pb";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./StageMap.css";

const HoverDot = forwardRef(function HoverDot(_, ref) {
  const map = useMap();
  const dotRef = useRef(null);

  useEffect(() => {
    const color =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--p")
        .trim() || "#ff6600";

    const dot = L.circleMarker([0, 0], {
      radius: 6,
      color: color,
      weight: 3,
      fillColor: "white",
      fillOpacity: 1,
      opacity: 1,
    });

    dot.remove();
    dotRef.current = dot;

    return () => {
      dot.remove();
      dotRef.current = null;
    };
  }, [map]);

  useImperativeHandle(ref, () => ({
    show(lat, lng) {
      if (!dotRef.current) return;
      dotRef.current.setLatLng([lat, lng]);
      if (!map.hasLayer(dotRef.current)) {
        dotRef.current.addTo(map);
      }
    },
    hide() {
      dotRef.current?.remove();
    },
  }));

  return null;
});

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

  // Track the latest selected activity in a ref for async callbacks
  const selectedActivityRef = useRef(null);
  useEffect(() => {
    selectedActivityRef.current = selectedActivity ?? null;
  }, [selectedActivity]);

  // If selection happens before a line layer is loaded, remember the id
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

  // ✅ Key helper: apply styles based on current selection
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

          // Create line (initial style can be unselected; we'll applySelectionStyles right after)
          const line = L.geoJSON(data, {
            style: () => ({ color: unselectedColor, weight: 4, opacity: 0.5 }),
          });

          lineByActivityIdRef.current.set(activity.id, line);

          // ✅ Critical: if selection happened before load, style it now
          applySelectionStyles(selectedActivityRef.current);

          // ✅ If selection happened before load, also fit now (optional)
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

              // Selection triggers styling+fit via selectedActivity effect
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
          line.bringToFront?.(); // keep color visible above outline
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

  // ✅ Selection effect: styles + fit (works from map click OR external buttons)
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

const StageMap = forwardRef(function StageMap(
  { stage, trip, selectedActivity, setSelectedActivity },
  ref
) {
  const hoverDotRef = useRef(null);

  useImperativeHandle(ref, () => ({
    setHoverPoint(pt) {
      if (!pt) return;
      hoverDotRef.current?.show(pt.lat, pt.lng);
    },
    clearHover() {
      hoverDotRef.current?.hide();
    },
  }));

  return (
    <div
      style={{
        height: "100%",
        borderRadius: 10,
        overflow: "hidden",
        position: "relative",
      }}
    >
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
          stage={stage}
          selectedActivity={selectedActivity}
          setSelectedActivity={setSelectedActivity}
          fitBounds={true}
          padding={[20, 20]}
        />

        <HoverDot ref={hoverDotRef} />
      </MapContainer>
    </div>
  );
});

export default StageMap;
