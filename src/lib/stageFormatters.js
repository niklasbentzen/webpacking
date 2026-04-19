// Format date
export function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  const month = d.toLocaleString(undefined, { month: "short" });
  return `${month} ${d.getDate()}, ${d.getFullYear()}`;
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

  if (!endDate || startDate.toDateString() === endDate.toDateString()) {
    return formatDate(startDate);
  }

  const startMonth = startDate.toLocaleString(undefined, { month: "short" });
  const startDay = startDate.getDate();
  const startYear = startDate.getFullYear();

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

  return `${month} ${day} — ${time}`;
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
