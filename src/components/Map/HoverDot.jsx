import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

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
      color,
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
      if (!map.hasLayer(dotRef.current)) dotRef.current.addTo(map);
    },
    hide() {
      dotRef.current?.remove();
    },
  }));

  return null;
});

export default HoverDot;
