import { pb } from "./pb";
import { gpx as gpxToGeoJSON } from "@tmcw/togeojson";
import simplify from "@turf/simplify";
import { parseGPX } from "@we-gold/gpxjs";
import {
  buildProfileFromPoints,
  computeStatsFromPoints,
  parseFitArrayBuffer,
  fitDataToTrackPoints,
  safeNum,
} from "./activities";

// ─── Error reporting ──────────────────────────────────────────────────────────

// Pull the actual PocketBase error out of a ClientResponseError instead of a
// generic "Upload failed" message, so live failures are diagnosable.
export function describeError(err) {
  if (!err) return "Unknown error";
  const status = err?.status ?? err?.response?.status;
  const data = err?.response?.data ?? err?.data;
  const fieldMsgs =
    data && typeof data === "object"
      ? Object.entries(data)
          .map(([field, info]) => `${field}: ${info?.message || JSON.stringify(info)}`)
          .join("; ")
      : "";
  const base = err?.response?.message || err?.message || "Request failed";
  return [status ? `HTTP ${status}` : null, base, fieldMsgs || null]
    .filter(Boolean)
    .join(" — ");
}

async function withRetry(fn, { retries = 2, delayMs = 800 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

// ─── Size capping ─────────────────────────────────────────────────────────────

const MAX_GEOJSON_BYTES = 1_000_000;

// GeoJSON content here is ASCII-only (numbers, brackets, commas), so JS
// string length is an accurate stand-in for UTF-8 byte length.
function jsonByteLength(obj) {
  return JSON.stringify(obj).length;
}

// Keeps every Nth coordinate, increasing the step until it fits — a blunt
// last resort for when simplify() alone can't get under the target size.
function decimateGeoJson(geoJson, maxBytes) {
  const feature = geoJson?.features?.[0];
  const coords = feature?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 3) return geoJson;

  let step = 2;
  let result = geoJson;
  while (jsonByteLength(result) > maxBytes && step < coords.length) {
    const decimated = coords.filter((_, i) => i % step === 0 || i === coords.length - 1);
    result = {
      ...geoJson,
      features: [{ ...feature, geometry: { ...feature.geometry, coordinates: decimated } }],
    };
    step++;
  }
  return result;
}

// Finds a simplify() tolerance that gets the geoJson close to (just under)
// maxBytes, rather than stopping at the first tolerance that happens to fit
// — the latter can wildly overshoot and throw away far more detail than
// needed. Grows an upper bound exponentially, then binary-searches between
// the last-too-big and first-fits tolerances to converge near the budget.
function capGeoJsonSize(geoJson, maxBytes = MAX_GEOJSON_BYTES, startTolerance = 0.00001) {
  if (jsonByteLength(geoJson) <= maxBytes) return geoJson;

  let low = 0;
  let high = startTolerance;
  let fits = null;

  for (let i = 0; i < 30; i++) {
    let candidate;
    try {
      candidate = simplify(geoJson, { tolerance: high, highQuality: false, mutate: false });
    } catch {
      break;
    }
    if (jsonByteLength(candidate) <= maxBytes) {
      fits = candidate;
      break;
    }
    low = high;
    high *= 2;
  }

  if (!fits) return decimateGeoJson(geoJson, maxBytes);

  let best = fits;
  for (let i = 0; i < 14; i++) {
    const mid = (low + high) / 2;
    let candidate;
    try {
      candidate = simplify(geoJson, { tolerance: mid, highQuality: false, mutate: false });
    } catch {
      break;
    }
    if (jsonByteLength(candidate) <= maxBytes) {
      best = candidate;
      high = mid;
    } else {
      low = mid;
    }
  }

  return best;
}

// ─── Point filtering ──────────────────────────────────────────────────────────

function isFiniteCoord(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function firstValidTime(points) {
  for (const p of points) {
    if (p.time) {
      const d = new Date(p.time);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return null;
}

function lastValidTime(points) {
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].time) {
      const d = new Date(points[i].time);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return null;
}

// ─── GPX (v2) ─────────────────────────────────────────────────────────────────

/**
 * Same output shape as processGpxFile, but tolerant of messy input:
 * - drops points with non-finite lat/lng instead of failing the whole file
 * - falls back to computing stats from points when the library's own
 *   distance/elevation numbers are missing or non-finite
 * - falls back to a manually-built LineString if togeojson can't produce one
 * - finds the first/last point with a *usable* timestamp instead of assuming
 *   points[0]/points[last] have one
 */
export async function processGpxFileV2(file) {
  const xmlText = await file.text();

  const [gpx, parseError] = parseGPX(xmlText);
  if (parseError) throw new Error(`Could not read this GPX file: ${parseError.message || parseError}`);

  const tracks = gpx?.tracks || [];
  const track = tracks.find((t) => t?.points?.length) || tracks[0];
  if (!track) throw new Error("No track data found in this GPX file.");

  const rawPoints = track.points || [];
  const points = rawPoints
    .map((p) => ({
      lat: p.latitude ?? p.lat,
      lng: p.longitude ?? p.lon ?? p.lng,
      ele: p.elevation ?? p.ele ?? null,
      time: p.time ?? null,
    }))
    .filter((p) => isFiniteCoord(p.lat, p.lng));

  if (!points.length) throw new Error("No usable GPS points found in this GPX file.");

  const computed = computeStatsFromPoints(points);
  const distanceM = Number.isFinite(track?.distance?.total) ? track.distance.total : computed.distanceM;
  const elevationGainM = Number.isFinite(track?.elevation?.positive) ? track.elevation.positive : computed.elevationGainM;
  const elevationLossM = Number.isFinite(track?.elevation?.negative) ? track.elevation.negative : computed.elevationLossM;
  const elevationMaxM = Number.isFinite(track?.elevation?.maximum) ? track.elevation.maximum : computed.elevationMaxM;
  const elevationMinM = Number.isFinite(track?.elevation?.minimum) ? track.elevation.minimum : computed.elevationMinM;
  const elevationAvgM = Number.isFinite(track?.elevation?.average) ? track.elevation.average : computed.elevationAvgM;

  const startTime = firstValidTime(points);
  const endTime = lastValidTime(points);

  let geoJson;
  try {
    const xml = new DOMParser().parseFromString(xmlText, "text/xml");
    const parsed = gpxToGeoJSON(xml);
    if (!parsed?.features?.length) throw new Error("empty geoJson");
    geoJson = parsed;
  } catch {
    geoJson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: points.map((p) => [p.lng, p.lat]) },
        },
      ],
    };
  }

  geoJson = capGeoJsonSize(geoJson);
  const geoJsonSmall = capGeoJsonSize(
    simplify(geoJson, { tolerance: 0.00005, highQuality: false, mutate: false }),
  );
  const profile = buildProfileFromPoints(points);

  return { geoJson, geoJsonSmall, profile, distanceM, elevationGainM, elevationLossM, elevationMaxM, elevationMinM, elevationAvgM, startTime, endTime };
}

// ─── FIT (v2) ─────────────────────────────────────────────────────────────────

/** Same output shape as processFitFile, with the same point-level tolerance as v2 GPX. */
export async function processFitFileV2(file) {
  const arrayBuffer = await file.arrayBuffer();
  let fitData;
  try {
    fitData = await parseFitArrayBuffer(arrayBuffer);
  } catch (err) {
    throw new Error(`Could not read this FIT file: ${err?.message || err}`);
  }

  const points = fitDataToTrackPoints(fitData).filter((p) => isFiniteCoord(p.lat, p.lng));
  if (!points.length) throw new Error("No usable GPS points found in this FIT file.");

  const session = (fitData?.sessions && fitData.sessions[0]) || null;
  const computed = computeStatsFromPoints(points);

  const distanceM = safeNum(session?.total_distance ?? session?.distance) || safeNum(computed.distanceM);
  const elevationGainM = safeNum(session?.total_ascent) || safeNum(computed.elevationGainM);
  const elevationLossM = safeNum(session?.total_descent) || safeNum(computed.elevationLossM);
  const elevationMaxM = safeNum(computed.elevationMaxM);
  const elevationMinM = safeNum(computed.elevationMinM);
  const elevationAvgM = safeNum(computed.elevationAvgM);

  const startTime = firstValidTime(points);
  const endTime = lastValidTime(points);

  let geoJson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: points.map((p) => [p.lng, p.lat]) },
      },
    ],
  };
  geoJson = capGeoJsonSize(geoJson);
  const geoJsonSmall = capGeoJsonSize(
    simplify(geoJson, { tolerance: 0.00005, highQuality: false, mutate: false }),
  );
  const profile = buildProfileFromPoints(points);

  return { geoJson, geoJsonSmall, profile, distanceM, elevationGainM, elevationLossM, elevationMaxM, elevationMinM, elevationAvgM, startTime, endTime };
}

// ─── Upload (v2) ──────────────────────────────────────────────────────────────

export async function createActivityV2(formData) {
  return withRetry(() => pb.collection("activities").create(formData));
}

// Uploads geoJSON/geoJSONSmall/profile as three separate requests instead of
// one combined one, each retried independently, so a single oversized/flaky
// field doesn't take the other two down with it — and so a failure tells you
// exactly which field and why.
export async function updateActivityFieldV2(activityId, fieldName, blob, filename) {
  const fd = new FormData();
  fd.append(fieldName, blob, filename);
  return withRetry(() => pb.collection("activities").update(activityId, fd));
}
