import { pb } from "./pb";
import { gpx as gpxToGeoJSON } from "@tmcw/togeojson";
import simplify from "@turf/simplify";
import { parseGPX } from "@we-gold/gpxjs";
import FitFileParser from "fit-file-parser";

// Fetch all activities for a list of stage records (sorted server-side per stage)
export async function fetchActivitiesForStages(stages) {
  if (!stages?.length) return [];

  const all = [];
  for (const stage of stages) {
    const res = await pb.collection("activities").getFullList({
      filter: `stage = '${stage.id}'`,
      sort: "startTime",
    });
    all.push(...res);
  }
  return all;
}

// Fetch all activities for a single stage, sorted by startTime
export async function fetchActivitiesForStage(stageId) {
  return pb.collection("activities").getFullList({
    filter: `stage = '${stageId}'`,
    sort: "startTime",
  });
}

// Update activity fields
export async function updateActivity(id, data) {
  return await pb.collection("activities").update(id, data);
}

// Create a new activity record
export async function createActivity(formData) {
  return pb.collection("activities").create(formData);
}

// Update an activity with derived files (geoJSON, profile, etc.)
export async function updateActivityFiles(activityId, formData) {
  return pb.collection("activities").update(activityId, formData);
}

// ─── File type detection ──────────────────────────────────────────────────────

export function isFitFile(f) {
  const name = (f?.name || "").toLowerCase();
  const type = (f?.type || "").toLowerCase();
  return (
    name.endsWith(".fit") ||
    type.includes("application/fit") ||
    type.includes("application/octet-stream")
  );
}

export function isGpxFile(f) {
  const name = (f?.name || "").toLowerCase();
  const type = (f?.type || "").toLowerCase();
  return (
    name.endsWith(".gpx") ||
    type.includes("application/gpx+xml") ||
    type.includes("application/xml") ||
    type.includes("text/xml")
  );
}

// ─── Processing helpers ───────────────────────────────────────────────────────

function toRad(x) {
  return (x * Math.PI) / 180;
}

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function safeNum(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function buildProfileFromPoints(points, maxPoints = 2000) {
  const n = points?.length ?? 0;
  if (!n) return [];

  const step = n > maxPoints ? Math.ceil(n / maxPoints) : 1;
  const out = [];
  let dist = 0;

  let prev = points[0];
  let prevLat = prev.latitude ?? prev.lat;
  let prevLng = prev.longitude ?? prev.lon ?? prev.lng;

  {
    const eleRaw = prev.elevation ?? prev.ele ?? null;
    out.push({
      i: 0,
      lat: prevLat,
      lng: prevLng,
      ele: eleRaw == null ? null : Number(eleRaw),
      distM: 0,
      time: prev.time ?? null,
    });
  }

  for (let i = 1; i < n; i++) {
    const p = points[i];
    const lat = p.latitude ?? p.lat;
    const lng = p.longitude ?? p.lon ?? p.lng;

    if (lat === lat && lng === lng && prevLat === prevLat && prevLng === prevLng) {
      dist += haversineM(prevLat, prevLng, lat, lng);
    }

    if (i % step === 0 || i === n - 1) {
      const eleRaw = p.elevation ?? p.ele ?? null;
      out.push({
        i,
        lat,
        lng,
        ele: eleRaw == null ? null : Number(eleRaw),
        distM: dist,
        time: p.time ?? null,
      });
    }

    prevLat = lat;
    prevLng = lng;
  }

  return out;
}

function computeStatsFromPoints(points) {
  let distM = 0;
  let gain = 0;
  let loss = 0;
  let eleMin = Infinity;
  let eleMax = -Infinity;
  let eleSum = 0;
  let eleCount = 0;
  let prevLat = null, prevLng = null, prevEle = null;

  for (const p of points || []) {
    const lat = p.lat;
    const lng = p.lng;
    const ele = p.ele;

    if (lat === lat && lng === lng && prevLat != null && prevLng != null && prevLat === prevLat && prevLng === prevLng) {
      distM += haversineM(prevLat, prevLng, lat, lng);
    }

    if (ele != null && Number.isFinite(ele)) {
      eleMin = Math.min(eleMin, ele);
      eleMax = Math.max(eleMax, ele);
      eleSum += ele;
      eleCount += 1;

      if (prevEle != null && Number.isFinite(prevEle)) {
        const d = ele - prevEle;
        if (d > 0) gain += d;
        else loss += -d;
      }
      prevEle = ele;
    }

    if (lat === lat && lng === lng) {
      prevLat = lat;
      prevLng = lng;
    }
  }

  return {
    distanceM: distM,
    elevationGainM: gain,
    elevationLossM: loss,
    elevationMinM: eleCount ? eleMin : 0,
    elevationMaxM: eleCount ? eleMax : 0,
    elevationAvgM: eleCount ? eleSum / eleCount : 0,
  };
}

// ─── FIT helpers ──────────────────────────────────────────────────────────────

function parseFitArrayBuffer(arrayBuffer) {
  return new Promise((resolve, reject) => {
    const parser = new FitFileParser({
      force: true,
      speedUnit: "m/s",
      lengthUnit: "m",
      temperatureUnit: "celsius",
    });
    parser.parse(arrayBuffer, (error, data) => {
      if (error) reject(error);
      else resolve(data);
    });
  });
}

function semicirclesToDegrees(sc) {
  const x = Number(sc);
  if (!Number.isFinite(x)) return NaN;
  return (x * 180) / 2147483648;
}

function normalizeLat(value) {
  const x = Number(value);
  if (!Number.isFinite(x)) return NaN;
  if (Math.abs(x) <= 90) return x;
  return semicirclesToDegrees(x);
}

function normalizeLng(value) {
  const x = Number(value);
  if (!Number.isFinite(x)) return NaN;
  if (Math.abs(x) <= 180) return x;
  return semicirclesToDegrees(x);
}

function fitDataToTrackPoints(fitData) {
  const records = fitData?.records || fitData?.record || [];
  const out = [];

  for (const r of records) {
    const rawLat = r.position_lat ?? r.positionLat ?? r.latitude;
    const rawLng = r.position_long ?? r.positionLong ?? r.longitude;
    const lat = normalizeLat(rawLat);
    const lng = normalizeLng(rawLng);
    const eleRaw = r.altitude ?? r.enhanced_altitude ?? r.elevation;
    const ele = eleRaw == null || !Number.isFinite(Number(eleRaw)) ? null : Number(eleRaw);
    const ts = r.timestamp ?? r.time_created ?? r.time;
    const time = ts ? new Date(ts).toISOString() : null;

    if (lat === lat && lng === lng) {
      out.push({ lat, lng, ele, time });
    }
  }

  return out;
}

// ─── File processing ──────────────────────────────────────────────────────────

/**
 * Process a GPX file and return stats + derived GeoJSON + elevation profile.
 * Returns: { geoJson, geoJsonSmall, profile, distanceM, elevationGainM,
 *            elevationLossM, elevationMaxM, elevationMinM, elevationAvgM,
 *            startTime, endTime }
 */
export async function processGpxFile(file) {
  const xmlText = await file.text();

  const [gpx, parseError] = parseGPX(xmlText);
  if (parseError) throw parseError;
  if (!gpx?.tracks?.length) throw new Error("No tracks found in GPX.");

  const track = gpx.tracks[0];
  const points = track?.points || [];
  if (!points.length) throw new Error("No track points found in GPX.");

  const distanceM = safeNum(track?.distance?.total);
  const elevationGainM = safeNum(track?.elevation?.positive);
  const elevationLossM = safeNum(track?.elevation?.negative);
  const elevationMaxM = safeNum(track?.elevation?.maximum);
  const elevationMinM = safeNum(track?.elevation?.minimum);
  const elevationAvgM = safeNum(track?.elevation?.average);

  const startTime = points[0]?.time ? new Date(points[0].time) : null;
  const endTime = points[points.length - 1]?.time ? new Date(points[points.length - 1].time) : null;

  const xml = new DOMParser().parseFromString(xmlText, "text/xml");
  const geoJson = gpxToGeoJSON(xml);
  const geoJsonSmall = simplify(geoJson, { tolerance: 0.00005, highQuality: false, mutate: false });
  const profile = buildProfileFromPoints(points);

  return { geoJson, geoJsonSmall, profile, distanceM, elevationGainM, elevationLossM, elevationMaxM, elevationMinM, elevationAvgM, startTime, endTime };
}

/**
 * Process a FIT file and return stats + derived GeoJSON + elevation profile.
 * Returns same shape as processGpxFile.
 */
export async function processFitFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const fitData = await parseFitArrayBuffer(arrayBuffer);

  const points = fitDataToTrackPoints(fitData);
  if (!points.length) throw new Error("No GPS track points found in FIT.");

  const session = (fitData?.sessions && fitData.sessions[0]) || null;
  const sessionDistance = session?.total_distance ?? session?.distance ?? null;
  const computed = computeStatsFromPoints(points);

  const distanceM = safeNum(sessionDistance) || safeNum(computed.distanceM);
  const elevationGainM = safeNum(session?.total_ascent) || safeNum(computed.elevationGainM);
  const elevationLossM = safeNum(session?.total_descent) || safeNum(computed.elevationLossM);
  const elevationMaxM = safeNum(computed.elevationMaxM);
  const elevationMinM = safeNum(computed.elevationMinM);
  const elevationAvgM = safeNum(computed.elevationAvgM);

  const startTime = points[0]?.time ? new Date(points[0].time) : null;
  const endTime = points[points.length - 1]?.time ? new Date(points[points.length - 1].time) : null;

  const geoJson = {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: points.map((p) => [p.lng, p.lat]) },
    }],
  };
  const geoJsonSmall = simplify(geoJson, { tolerance: 0.00005, highQuality: false, mutate: false });
  const profile = buildProfileFromPoints(points);

  return { geoJson, geoJsonSmall, profile, distanceM, elevationGainM, elevationLossM, elevationMaxM, elevationMinM, elevationAvgM, startTime, endTime };
}
