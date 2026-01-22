// src/lib/gpxLayers.js
import L from "leaflet";
import "leaflet-gpx";
import { pb } from "./pb";

export function makePlannedTripGpxLayer(trip, fileField = "plannedTrip") {
  const file = trip?.[fileField];
  if (!trip || !file) return null;

  const url = pb.files.getURL(trip, file);

  return new L.GPX(url, {
    async: true,
    polyline_options: {
      color: "#000",
      weight: 4,
      opacity: 0.2,
      dashArray: "5 10",
      dashOffset: "10",
    },
    markers: {
      startIcon: null,
      endIcon: null,
      shadowUrl: null,
      wptIconUrls: {},
    },
  });
}

export function makeActivityRouteLayers(activity, color) {
  if (!activity?.gpxFile) return null;

  const url = pb.files.getURL(activity, activity.gpxFile);

  const outline = new L.GPX(url, {
    async: true,
    polyline_options: { color: "#ffffff", weight: 8, opacity: 1 },
    markers: {
      startIcon: null,
      endIcon: null,
      shadowUrl: null,
      wptIconUrls: {},
    },
  });

  const line = new L.GPX(url, {
    async: true,
    polyline_options: { color, weight: 4, opacity: 0.5 },
    markers: {
      startIcon: null,
      endIcon: null,
      shadowUrl: null,
      wptIconUrls: {},
    },
  });

  const hit = new L.GPX(url, {
    async: true,
    polyline_options: { color: "#000", weight: 25, opacity: 0 },
    markers: {
      startIcon: null,
      endIcon: null,
      shadowUrl: null,
      wptIconUrls: {},
    },
  });

  return { outline, line, hit, url };
}
