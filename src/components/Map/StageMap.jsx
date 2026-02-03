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
  stage,
  selectedActivity,
  setSelectedAcitivity: setSelectedActivity,
  fitBounds = true,
  padding = [20, 20],
}) {
  const map = useMap();
  const groupRef = useRef(L.featureGroup());
  const suppressNextMapClickRef = useRef(false);
  const didInitialFitRef = useRef(false);

  const [activities, setActivities] = useState([]);

  const cssVar = (name, fallback) => {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    return v || fallback;
  };

  // ✅ Extract activities from ONE stage
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

    const selectedColor = cssVar("--p");
    const unselectedColor = "green";

    let cancelled = false;

    (async () => {
      for (const activity of activities) {
        const file = activity.geoJSON || activity.geoJSONSmall; // prefer full
        if (!file) continue;

        const url = pb.files.getURL(activity, file);
        if (!url) continue;

        try {
          const res = await fetch(url);
          const data = await res.json();
          if (cancelled) return;

          const outline = L.geoJSON(data, {
            style: () => ({ color: "#ffffff", weight: 8, opacity: 1 }),
          });

          const line = L.geoJSON(data, {
            style: () => ({ color: unselectedColor, weight: 4, opacity: 0.5 }),
          });

          const hit = L.geoJSON(data, {
            style: () => ({ color: "#000", weight: 22, opacity: 0 }),
          });

          hit.eachLayer((hitLayer) => {
            hitLayer.on("click", (e) => {
              suppressNextMapClickRef.current = true;
              L.DomEvent.stopPropagation(e);

              setSelectedActivity?.(activity.id);

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
              const isSelected = selectedActivity === activity.id;
              line.setStyle?.({ opacity: isSelected ? 1 : 0.5 });
            });
          });

          outline.addTo(group);
          line.addTo(group);
          hit.addTo(group);

          // apply correct initial style
          const isSelected = selectedActivity === activity.id;
          line.setStyle?.({
            color: isSelected ? selectedColor : unselectedColor,
            opacity: isSelected ? 1 : 0.5,
          });
        } catch (e) {
          console.warn("Failed to load GeoJSON:", url, e);
        }
      }

      if (!didInitialFitRef.current && fitBounds) {
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
  }, [
    map,
    activities,
    fitBounds,
    padding,
    selectedActivity,
    setSelectedActivity,
  ]);

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

export default function StageMap({
  stage,
  trip,
  selectedActivity,
  setSelectedActivity,
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
          stage={stage}
          selectedActivity={selectedActivity}
          setSelectedAcitivity={setSelectedActivity}
          fitBounds={true}
          padding={[20, 20]}
        />
      </MapContainer>
    </div>
  );
}
