import { useMemo, useState } from "react";
import { gpx as gpxToGeoJSON } from "@tmcw/togeojson";
import simplify from "@turf/simplify";
import { parseGPX } from "@we-gold/gpxjs";
import FitFileParser from "fit-file-parser";
import { pb } from "../../lib/pb";

/**
 * Distance helpers (meters)
 */
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

function toGeoJSONFromXmlText(xmlText) {
  const xml = new DOMParser().parseFromString(xmlText, "text/xml");
  return gpxToGeoJSON(xml);
}

// FIT: semicircles -> degrees
function semicirclesToDegrees(sc) {
  const x = Number(sc);
  if (!Number.isFinite(x)) return NaN;
  return (x * 180) / 2147483648; // 2^31
}

function isFitFile(f) {
  const name = (f?.name || "").toLowerCase();
  const type = (f?.type || "").toLowerCase();
  return (
    name.endsWith(".fit") ||
    type.includes("application/fit") ||
    type.includes("application/octet-stream") // common for .fit
  );
}

function isGpxFile(f) {
  const name = (f?.name || "").toLowerCase();
  const type = (f?.type || "").toLowerCase();
  return (
    name.endsWith(".gpx") ||
    type.includes("application/gpx+xml") ||
    type.includes("application/xml") ||
    type.includes("text/xml")
  );
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

    if (
      lat === lat &&
      lng === lng &&
      prevLat === prevLat &&
      prevLng === prevLng
    ) {
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

/**
 * Compute stats from point stream (fallback for FIT when session stats missing)
 */
function computeStatsFromPoints(points) {
  let distM = 0;
  let gain = 0;
  let loss = 0;

  let eleMin = Infinity;
  let eleMax = -Infinity;
  let eleSum = 0;
  let eleCount = 0;

  let prevLat = null,
    prevLng = null,
    prevEle = null;

  for (const p of points || []) {
    const lat = p.lat;
    const lng = p.lng;
    const ele = p.ele;

    if (
      lat === lat &&
      lng === lng &&
      prevLat != null &&
      prevLng != null &&
      prevLat === prevLat &&
      prevLng === prevLng
    ) {
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

/**
 * FIT parsing in browser via fit-file-parser
 */
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

function normalizeLat(value) {
  const x = Number(value);
  if (!Number.isFinite(x)) return NaN;

  // Already degrees?
  if (Math.abs(x) <= 90) return x;

  // Likely semicircles
  return semicirclesToDegrees(x);
}

function normalizeLng(value) {
  const x = Number(value);
  if (!Number.isFinite(x)) return NaN;

  // Already degrees?
  if (Math.abs(x) <= 180) return x;

  // Likely semicircles
  return semicirclesToDegrees(x);
}

function fitDataToTrackPoints(fitData) {
  const records = fitData?.records || fitData?.record || [];
  const out = [];

  for (const r of records) {
    // fit-file-parser commonly uses these keys
    const rawLat = r.position_lat ?? r.positionLat ?? r.latitude;
    const rawLng = r.position_long ?? r.positionLong ?? r.longitude;

    const lat = normalizeLat(rawLat);
    const lng = normalizeLng(rawLng);

    const eleRaw = r.altitude ?? r.enhanced_altitude ?? r.elevation;
    const ele =
      eleRaw == null || !Number.isFinite(Number(eleRaw))
        ? null
        : Number(eleRaw);

    const ts = r.timestamp ?? r.time_created ?? r.time;
    const time = ts ? new Date(ts).toISOString() : null;

    if (lat === lat && lng === lng) {
      out.push({ lat, lng, ele, time });
    }
  }

  return out;
}

function fitPointsToGeoJSON(points) {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: (points || []).map((p) => [p.lng, p.lat]),
        },
      },
    ],
  };
}

export default function AdminUploadGpx({
  stageId,
  defaultType = "Bike",
  activities,
  setActivities,
}) {
  const [type, setType] = useState(defaultType);
  const [file, setFile] = useState(null);

  const [status, setStatus] = useState("idle"); // idle | uploading | converting | done | error
  const [message, setMessage] = useState("");
  const [createdActivity, setCreatedActivity] = useState(null);

  const canSubmit = useMemo(() => {
    return (
      !!stageId && !!file && status !== "uploading" && status !== "converting"
    );
  }, [stageId, file, status]);

  async function onSubmit(e) {
    e.preventDefault();
    setMessage("");
    setCreatedActivity(null);

    if (!stageId) {
      setStatus("error");
      setMessage("Missing stageId.");
      return;
    }
    if (!file) {
      setStatus("error");
      setMessage("Please choose a GPX or FIT file.");
      return;
    }

    const fileIsFit = isFitFile(file);
    const fileIsGpx = isGpxFile(file);

    if (!fileIsFit && !fileIsGpx) {
      setStatus("error");
      setMessage("Unsupported file type. Please upload a .gpx or .fit file.");
      return;
    }

    try {
      setStatus("uploading");
      setMessage(`Reading + uploading ${fileIsFit ? "FIT" : "GPX"}…`);

      let distanceM = 0;
      let elevationGainM = 0;
      let elevationLossM = 0;
      let elevationMaxM = 0;
      let elevationMinM = 0;
      let elevationAvgM = 0;
      let startTime = null;
      let endTime = null;

      let geojson = null;
      let geojsonSmall = null;
      let profile = null;

      // 1) Create activity (upload original file + stats)
      const fdCreate = new FormData();
      fdCreate.append("stage", stageId);
      fdCreate.append("type", type);

      if (fileIsGpx) {
        const xmlText = await file.text();

        const [gpx, parseError] = parseGPX(xmlText);
        if (parseError) throw parseError;
        if (!gpx?.tracks?.length) throw new Error("No tracks found in GPX.");

        const track = gpx.tracks[0];
        const points = track?.points || [];
        if (!points.length) throw new Error("No track points found in GPX.");

        distanceM = safeNum(track?.distance?.total);
        elevationGainM = safeNum(track?.elevation?.positive);
        elevationLossM = safeNum(track?.elevation?.negative);
        elevationMaxM = safeNum(track?.elevation?.maximum);
        elevationMinM = safeNum(track?.elevation?.minimum);
        elevationAvgM = safeNum(track?.elevation?.average);

        startTime = points[0]?.time ? new Date(points[0].time) : null;
        endTime = points[points.length - 1]?.time
          ? new Date(points[points.length - 1].time)
          : null;

        fdCreate.append("gpxFile", file);

        // Derived outputs
        setStatus("converting");
        setMessage("Converting GPX → GeoJSON + profile…");

        geojson = toGeoJSONFromXmlText(xmlText);
        geojsonSmall = simplify(geojson, {
          tolerance: 0.00005, // ~5m-ish
          highQuality: false,
          mutate: false,
        });

        profile = buildProfileFromPoints(points);
      } else {
        // FIT
        const arrayBuffer = await file.arrayBuffer();
        const fitData = await parseFitArrayBuffer(arrayBuffer);

        const points = fitDataToTrackPoints(fitData);
        if (!points.length)
          throw new Error("No GPS track points found in FIT.");

        // Prefer FIT session stats if present
        const session = (fitData?.sessions && fitData.sessions[0]) || null;

        const sessionDistance =
          session?.total_distance ?? session?.distance ?? null;

        // Elevation fields vary; still keep computed as fallback
        const computed = computeStatsFromPoints(points);

        distanceM = safeNum(sessionDistance) || safeNum(computed.distanceM);

        elevationGainM =
          safeNum(session?.total_ascent) || safeNum(computed.elevationGainM);
        elevationLossM =
          safeNum(session?.total_descent) || safeNum(computed.elevationLossM);

        elevationMaxM = safeNum(computed.elevationMaxM);
        elevationMinM = safeNum(computed.elevationMinM);
        elevationAvgM = safeNum(computed.elevationAvgM);

        startTime = points[0]?.time ? new Date(points[0].time) : null;
        endTime = points[points.length - 1]?.time
          ? new Date(points[points.length - 1].time)
          : null;

        fdCreate.append("fitFile", file);

        // Derived outputs
        setStatus("converting");
        setMessage("Creating geojson...");

        geojson = fitPointsToGeoJSON(points);
        console.log(geojson);

        setMessage("Simplifying geojson...");
        geojsonSmall = simplify(geojson, {
          tolerance: 0.00005,
          highQuality: false,
          mutate: false,
        });

        setMessage("Creating hight profile...");
        // Adapt to existing profile builder’s expected keys
        const pointsForProfile = points.map((p) => ({
          lat: p.lat,
          lng: p.lng,
          ele: p.ele,
          time: p.time,
        }));

        profile = buildProfileFromPoints(pointsForProfile);
      }

      fdCreate.append("distanceM", String(distanceM));
      fdCreate.append("elevationGainM", String(elevationGainM));
      fdCreate.append("elevationLossM", String(elevationLossM));
      fdCreate.append("elevationMaxM", String(elevationMaxM));
      fdCreate.append("elevationMinM", String(elevationMinM));
      fdCreate.append("elevationAvgM", String(elevationAvgM));

      if (startTime) fdCreate.append("startTime", startTime.toISOString());
      if (endTime) fdCreate.append("endTime", endTime.toISOString());

      setMessage("Creating activity in pb...");
      const activity = await pb.collection("activities").create(fdCreate);
      setCreatedActivity(activity);

      // 2) Update activity with generated files
      setMessage("Uploading GeoJSON + profile…");

      const fdUpdate = new FormData();

      fdUpdate.append(
        "geoJSON",
        new Blob([JSON.stringify(geojson)], { type: "application/geo+json" }),
        "route.geojson",
      );

      fdUpdate.append(
        "geoJSONSmall",
        new Blob([JSON.stringify(geojsonSmall)], {
          type: "application/geo+json",
        }),
        "route.small.geojson",
      );

      fdUpdate.append(
        "profile",
        new Blob([JSON.stringify(profile)], { type: "application/json" }),
        "profile.json",
      );

      const updated = await pb
        .collection("activities")
        .update(activity.id, fdUpdate);

      setCreatedActivity(updated);
      setActivities([updated, ...activities]);
      setStatus("done");
      setMessage("Done ✅");
      setFile(null);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage(err?.message || "Upload failed.");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{ display: "grid", gap: 12, maxWidth: 520 }}
    >
      <label style={{ display: "grid", gap: 6 }}>
        Activity type
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="Bike">Bike</option>
          <option value="Hike">Hike</option>
        </select>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        GPX / FIT file
        <input
          type="file"
          accept=".gpx,.fit,application/gpx+xml,text/xml,application/xml,application/octet-stream"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </label>

      <button type="submit" disabled={!canSubmit}>
        {status === "uploading"
          ? "Uploading…"
          : status === "converting"
            ? "Converting…"
            : "Upload"}
      </button>

      {message && <p style={{ margin: 0 }}>{message}</p>}

      {createdActivity?.id && (
        <p style={{ margin: 0, opacity: 0.8 }}>
          Activity id: <code>{createdActivity.id}</code>
        </p>
      )}
    </form>
  );
}
