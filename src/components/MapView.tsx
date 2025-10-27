import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L, { polyline, marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-gpx";
import supabase from "../utils/supabase";

import startIconUrl from "../assets/marker_start.png";
import endIconUrl from "../assets/marker_finish.png";

const startIcon = L.icon({
  iconUrl: startIconUrl,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -5],
});

const endIcon = L.icon({
  iconUrl: endIconUrl,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -5],
});

function GPXLoader({ tripId }: { tripId: string }) {
  const map = useMap();

  useEffect(() => {
    const loadGPX = async () => {
      const { data: segments, error } = await supabase
        .from("segments")
        .select("id, name, gpx_path")
        .eq("trip_id", tripId);

      if (error) {
        console.error("Failed to load segments:", error);
        return;
      }

      if (!segments || segments.length === 0) return;

      segments.forEach((segment) => {
        const paths = Array.isArray(segment.gpx_path)
          ? segment.gpx_path
          : [segment.gpx_path].filter(Boolean);

        paths.forEach((url: string) => {
          if (!url || typeof url !== "string") {
            console.warn("Skipping invalid GPX path:", segment.gpx_path);
            return;
          }

          new L.GPX(url, {
            async: true,
            markers: {
              startIcon: null,
              endIcon: null,
              shadowUrl: null,
            },
            polyline_options: { color: "black", weight: 4, opacity: 0.5 },
          })
            .on("loaded", (e: any) => {
              map.fitBounds(e.target.getBounds());
            })
            .on("error", (e: any) => {
              console.error("Failed to load GPX file:", e);
            })
            .addTo(map);
        });
      });
    };

    loadGPX();
  }, [map, tripId]);

  return null;
}

function CmdCtrlZoomToggle() {
  const map = useMap();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) map.scrollWheelZoom.enable();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) map.scrollWheelZoom.disable();
    };

    // Ensure zoom is disabled by default
    map.scrollWheelZoom.disable();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", () => map.scrollWheelZoom.disable());

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [map]);

  return null;
}

export default function MapView({ tripId }: { tripId: string }) {
  const position: [number, number] = [51.505, -0.09];

  return (
    <MapContainer
      scrollWheelZoom={false}
      style={{ height: "80vh", width: "100%" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <GPXLoader tripId={tripId} />
      <CmdCtrlZoomToggle />
    </MapContainer>
  );
}
