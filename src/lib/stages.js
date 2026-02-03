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
    return `${startMonth} ${startDay} — ${endMonth} ${endDay}, ${startYear}`;
  }

  return `${startMonth} ${startDay}, ${startYear} — ${endMonth} ${endDay}, ${endYear}`;
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
    if (typeof a.elevationM === "number") elevationM += a.elevationM;

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
