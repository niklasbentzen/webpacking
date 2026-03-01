import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./StageMap.css"; // keep if it contains leaflet fixes etc.

import HoverDot from "./HoverDot";

/**
 * Reusable map shell.
 *
 * Usage:
 * <Map ref={mapRef}>
 *   <StageLayers ... />
 *   <PlannedRoute ... />
 *   <CurrentPosition ... />
 * </Map>
 */
const Map = forwardRef(function Map(
  {
    children,
    center = [56, 10],
    zoom = 6,
    className,
    style,
    tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    tileAttribution = "&copy; OpenStreetMap contributors",
  },
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
      className={className}
      style={{
        height: "100%",
        borderRadius: 10,
        overflow: "hidden",
        position: "relative",
        ...style,
      }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer attribution={tileAttribution} url={tileUrl} />

        {children}

        {/* Always available to consumers via Map ref */}
        <HoverDot ref={hoverDotRef} />
      </MapContainer>
    </div>
  );
});

export default Map;
