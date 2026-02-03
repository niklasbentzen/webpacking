import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * geojsonItems = [
 *   {
 *     id: "activity-1",
 *     data: <GeoJSON FeatureCollection | Feature | Geometry>,
 *     style?: (feature) => ({ color, weight, opacity, ... }),
 *     onClick?: (feature, layer, event) => void,
 *     onHover?: (isHovering, feature, layer, event) => void,
 *   }
 * ]
 */
function GeoJSONLayers({ geojsonItems, fitBounds = true, padding = [20, 20] }) {
  const map = useMap();
  const groupRef = useRef(L.featureGroup());

  // Normalize list
  const items = useMemo(
    () => geojsonItems?.filter((x) => x?.data) || [],
    [geojsonItems]
  );

  useEffect(() => {
    const group = groupRef.current;
    group.clearLayers();
    group.addTo(map);

    return () => {
      group.clearLayers();
      if (map.hasLayer(group)) map.removeLayer(group);
    };
  }, [map]);

  useEffect(() => {
    const group = groupRef.current;
    group.clearLayers();

    if (!items.length) return;

    // Create Leaflet GeoJSON layers and add to group so we can fit bounds
    for (const item of items) {
      const leafletLayer = L.geoJSON(item.data, {
        style: item.style,
        onEachFeature: (feature, layer) => {
          if (item.onClick) {
            layer.on("click", (e) => item.onClick(feature, layer, e));
          }
          if (item.onHover) {
            layer.on("mouseover", (e) => item.onHover(true, feature, layer, e));
            layer.on("mouseout", (e) => item.onHover(false, feature, layer, e));
          }
        },
      });

      group.addLayer(leafletLayer);
    }

    if (fitBounds) {
      const bounds = group.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding });
    }
  }, [items, map, fitBounds, padding]);

  return (
    <>
      {items.map((item) => (
        <GeoJSON
          key={item.id}
          data={item.data}
          style={item.style}
          onEachFeature={(feature, layer) => {
            if (item.onClick) {
              layer.on("click", (e) => item.onClick(feature, layer, e));
            }
            if (item.onHover) {
              layer.on("mouseover", (e) =>
                item.onHover(true, feature, layer, e)
              );
              layer.on("mouseout", (e) =>
                item.onHover(false, feature, layer, e)
              );
            }
          }}
        />
      ))}
    </>
  );
}

export default function Map({
  geojsonItems = [],
  height = 520,
  fitBounds = true,
  padding = [20, 20],
}) {
  return (
    <div style={{ height, borderRadius: 10, overflow: "hidden" }}>
      <MapContainer
        center={[56, 10]}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <GeoJSONLayers
          geojsonItems={geojsonItems}
          fitBounds={fitBounds}
          padding={padding}
        />
      </MapContainer>
    </div>
  );
}
