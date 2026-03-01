// src/lib/stages.js
import { pb } from "./pb";

/**
 * Get a stage by its ID, with activities expanded (back relation)
 */
export async function fetchStageByIdWithActivities(stageId) {
  return await pb
    .collection("stages")
    .getFirstListItem(`id='${stageId}'`, { expand: "activities_via_stage" });
}

/**
 * Formats:
 * - May 7, 2026
 * - May 7 — May 8, 2026
 * - Dec 30, 2026 — Jan 2, 2027
 * Always shows the month on both sides.
 */
export function formatDateRange(start, end) {
  if (!start) return null;

  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;

  const startMonth = startDate.toLocaleString(undefined, { month: "short" });
  const startDay = startDate.getDate();
  const startYear = startDate.getFullYear();

  if (!endDate || startDate.toDateString() === endDate.toDateString()) {
    return `${startMonth} ${startDay}, ${startYear}`;
  }

  const endMonth = endDate.toLocaleString(undefined, { month: "short" });
  const endDay = endDate.getDate();
  const endYear = endDate.getFullYear();

  if (startYear === endYear) {
    return `${startMonth} ${startDay} → ${endMonth} ${endDay}, ${startYear}`;
  }

  return `${startMonth} ${startDay}, ${startYear} → ${endMonth} ${endDay}, ${endYear}`;
}

// Format start time without seconds, e.g. "May 7, 2026, 19:45"
export function formatStartTime(start) {
  if (!start) return null;

  const date = new Date(start);

  const month = date.toLocaleString(undefined, { month: "short" });
  const day = date.getDate();
  const year = date.getFullYear();

  const time = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${month} ${day}, ${year} — ${time}`;
}

export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return null;

  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h === 0) {
    return `${m}m`;
  }

  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function getStageDateRangeFromActivities(activities) {
  let start = null;
  let end = null;

  for (const a of activities || []) {
    if (!a.startTime) continue;

    const s = new Date(a.startTime);
    const e = a.endTime ? new Date(a.endTime) : s;

    if (!start || s < start) start = s;
    if (!end || e > end) end = e;
  }

  return { start, end };
}

export function summarizeActivities(activities) {
  let distanceM = 0;
  let elevationM = 0;
  let durationMs = 0;

  let bikeCount = 0;
  let hikeCount = 0;

  for (const a of activities || []) {
    if (typeof a.distanceM === "number") distanceM += a.distanceM;
    if (typeof a.elevationGainM === "number") elevationM += a.elevationGainM;

    if (a.type === "Bike") bikeCount += 1;
    if (a.type === "Hike") hikeCount += 1;

    if (a.startTime) {
      const start = new Date(a.startTime);
      const end = a.endTime ? new Date(a.endTime) : start;
      const ms = end - start;
      if (Number.isFinite(ms) && ms > 0) durationMs += ms;
    }
  }

  return {
    bikeCount,
    hikeCount,
    distanceM: distanceM || null,
    elevationM: elevationM || null,
    duration: formatDuration(durationMs),
  };
}

/** Expand helper: stages -> activities */
export function getExpandedActivitiesForStage(stage) {
  return stage?.expand?.activities_via_stage || [];
}

export function activityGpxUrl(activity) {
  if (!activity?.gpxFile) return null;
  return pb.files.getURL(activity, activity.gpxFile);
}

export async function createStage(data) {
  return pb.collection("stages").create(data);
}

export async function updateStage(stageId, data) {
  return pb.collection("stages").update(stageId, data);
}

export async function deleteStage(stageId) {
  return pb.collection("stages").delete(stageId);
}

export async function deleteActivity(activityId) {
  return pb.collection("activities").delete(activityId);
}

// Image upload

export async function optimizeImage(
  file,
  {
    maxWidth = 2000,
    maxHeight = 2000,
    quality = 0.8,
    type = "image/jpeg", // or image/webp
  } = {}
) {
  const img = await loadImage(file);

  let { width, height } = img;

  // scale down if too large
  const scale = Math.min(1, maxWidth / width, maxHeight / height);

  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = newWidth;
  canvas.height = newHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, newWidth, newHeight);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, type, quality)
  );

  return new File([blob], file.name, { type });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export async function uploadStageImage(stageId, file) {
  const optimized = await optimizeImage(file, {
    maxWidth: 2000,
    maxHeight: 2000,
    quality: 0.7,
    type: "image/jpeg",
  });

  const form = new FormData();
  form.append("images+", optimized);

  const updated = await pb.collection("stages").update(stageId, form);

  const filename = updated.images[updated.images.length - 1];
  const url = pb.files.getURL(updated, filename);

  return { url, filename, record: updated };
}

export async function deleteStageImage(stageId, filename) {
  const updated = await pb.collection("stages").update(stageId, {
    "images-": filename,
  });

  return updated;
}
