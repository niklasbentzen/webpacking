import {
  PersonSimpleBikeIcon,
  PersonSimpleHikeIcon,
  BoatIcon,
  TrainIcon,
  BusIcon,
} from "@phosphor-icons/react";

export const ACTIVITY_TYPES = ["Bike", "Hike", "Ferry", "Train", "Bus"];

export const ACTIVITY_TYPE_ICONS = {
  Bike: PersonSimpleBikeIcon,
  Hike: PersonSimpleHikeIcon,
  Ferry: BoatIcon,
  Train: TrainIcon,
  Bus: BusIcon,
};

// Fixed literal colors (not theme-reactive) — tracks are always drawn over
// the light OpenStreetMap tile layer regardless of the site's light/dark mode.
export const ACTIVITY_TYPE_COLORS = {
  Bike: "#3f8f29",
  Hike: "#e08a1e",
  Ferry: "#2b7fd1",
  Train: "#8451c9",
  Bus: "#d1395a",
};

export const ACTIVITY_TYPE_LABELS = {
  Bike: "Bike",
  Hike: "Hike",
  Ferry: "Ferry",
  Train: "Train",
  Bus: "Bus",
};

export function getActivityTypeColor(type) {
  return ACTIVITY_TYPE_COLORS[type] ?? ACTIVITY_TYPE_COLORS.Bike;
}
