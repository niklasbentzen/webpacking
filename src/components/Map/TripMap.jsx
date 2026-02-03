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

    const file = trip?.plannedTrip; // <-- your GeoJSON file field
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

  const lineLayersByStageRef = useRef(new Map()); // stageId -> array of L.GeoJSON layers
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
    console.log("Extracted activities for stages:", allActivities);
  }, [stages]);

  // Build layers once per activities change (NOT per click)
  useEffect(() => {
    const group = groupRef.current;
    group.clearLayers();
    group.addTo(map);

    lineLayersByStageRef.current.clear();

    const selectedColor = cssVar("--p");
    const unselectedColor = "green";

    let cancelled = false;

    (async () => {
      for (const activity of activities) {
        if (!activity?.geoJSONSmall && !activity?.geoJSON) continue;

        const file = activity.geoJSONSmall || activity.geoJSON;
        const url = pb.files.getURL(activity, file);
        if (!url) continue;

        try {
          const res = await fetch(url);
          const data = await res.json();
          if (cancelled) return;

          const outline = L.geoJSON(data, {
            style: () => ({ color: "#ffffff", weight: 8, opacity: 1 }),
          });

          // default is always "unselected" style; selection is applied via effect below
          const line = L.geoJSON(data, {
            style: () => ({ color: unselectedColor, weight: 4, opacity: 0.5 }),
          });

          const hit = L.geoJSON(data, {
            style: () => ({ color: "#000", weight: 22, opacity: 0 }),
          });

          // register line under stage id so we can style it later without rebuilding
          if (!lineLayersByStageRef.current.has(activity.stage)) {
            lineLayersByStageRef.current.set(activity.stage, []);
          }
          lineLayersByStageRef.current.get(activity.stage).push(line);

          hit.eachLayer((hitLayer) => {
            hitLayer.on("click", (e) => {
              suppressNextMapClickRef.current = true;
              L.DomEvent.stopPropagation(e);

              setClickedStage?.(activity.stage);

              const bounds = line.getBounds();
              if (bounds.isValid()) {
                map.fitBounds(bounds, { padding });
              }

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
              const isSelected = clickedStage === activity.stage;
              line.setStyle?.({ opacity: isSelected ? 1 : 0.5 });
            });
          });

          outline.addTo(group);
          line.addTo(group);
          hit.addTo(group);

          // apply correct initial style immediately (in case clickedStage already set)
          const isSelected = clickedStage === activity.stage;
          line.setStyle?.({
            color: isSelected ? selectedColor : unselectedColor,
            opacity: isSelected ? 1 : 0.5,
          });
        } catch (e) {
          console.warn("Failed to load GeoJSON:", url, e);
        }
      }

      if (!didInitialFitRef.current) {
        const bounds = group.getBounds();

        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding });
          didInitialFitRef.current = true;
        }
      }
    })();

    return () => {
      cancelled = true;
      group.clearLayers();
      if (map.hasLayer(group)) map.removeLayer(group);
    };
  }, [map, activities, fitBounds, padding, clickedStage, setClickedStage]);

  // Update styles on clickedStage change
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
  console.log(stages);
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
