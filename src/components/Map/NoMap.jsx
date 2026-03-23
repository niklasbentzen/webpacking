import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./NoMap.css";

import HoverDot from "./HoverDot";

const NoMap = forwardRef(function Map(
  {
    children,
    center = [56, 10],
    zoom = 6,
    className = "",
    style,
    darkMode, // optional: true / false, otherwise follows system
  },
  ref,
) {
  const hoverDotRef = useRef(null);
  const [prefersDark, setPrefersDark] = useState(false);

  useImperativeHandle(ref, () => ({
    setHoverPoint(pt) {
      if (!pt) return;
      hoverDotRef.current?.show(pt.lat, pt.lng);
    },
    clearHover() {
      hoverDotRef.current?.hide();
    },
  }));

  useEffect(() => {
    if (typeof darkMode === "boolean") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setPrefersDark(media.matches);

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [darkMode]);

  const isDark = typeof darkMode === "boolean" ? darkMode : prefersDark;

  const createDuotoneFilter = (dark, light) => {
    const calc = (d, l) => ({
      slope: (l - d) / 255,
      intercept: d / 255,
    });

    return {
      r: calc(dark[0], light[0]),
      g: calc(dark[1], light[1]),
      b: calc(dark[2], light[2]),
    };
  };

  // black parts of the tile -> map ink
  // white parts of the tile -> background paper
  const palette = useMemo(() => {
    if (isDark) {
      return {
        ink: [18, 24, 17],
        paper: [37, 42, 30],
        mapBackground: "rgb(37, 42, 30)",
      };
    }

    return {
      ink: [151, 189, 159],
      paper: [248, 247, 242],
      mapBackground: "rgb(248, 247, 242)",
    };
  }, [isDark]);

  const filter = useMemo(
    () => createDuotoneFilter(palette.ink, palette.paper),
    [palette],
  );

  return (
    <div
      className={`no-map ${isDark ? "is-dark" : "is-light"} ${className}`}
      style={{
        height: "100%",
        overflow: "hidden",
        position: "relative",
        background: palette.mapBackground,
        ...style,
      }}
    >
      <svg
        aria-hidden="true"
        width="0"
        height="0"
        style={{ position: "absolute", pointerEvents: "none" }}
      >
        <filter id="no-map-duotone" colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR
              type="linear"
              slope={filter.r.slope}
              intercept={filter.r.intercept}
            />
            <feFuncG
              type="linear"
              slope={filter.g.slope}
              intercept={filter.g.intercept}
            />
            <feFuncB
              type="linear"
              slope={filter.b.slope}
              intercept={filter.b.intercept}
            />
          </feComponentTransfer>
        </filter>
      </svg>

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        dragging={false} // you already have this
        zoomSnap={0.1}
        zoomDelta={1}
      >
        <TileLayer
          url="https://tiles.stadiamaps.com/tiles/stamen_toner_background/{z}/{x}/{y}{r}.{ext}"
          minZoom={0}
          maxZoom={20}
          attribution='&copy; <a href="https://www.stadiamaps.com/" target="_blank" rel="noreferrer">Stadia Maps</a> &copy; <a href="https://www.stamen.com/" target="_blank" rel="noreferrer">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
          ext="png"
        />

        {children}
        <HoverDot ref={hoverDotRef} />
      </MapContainer>
    </div>
  );
});

export default NoMap;
