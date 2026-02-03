import { useMemo, useState } from "react";
import { gpx as gpxToGeoJSON } from "@tmcw/togeojson";
import simplify from "@turf/simplify";
import { parseGPX } from "@we-gold/gpxjs";
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

function buildProfileFromGpxTrackPoints(points, maxPoints = 2000) {
  const n = points?.length ?? 0;
  if (!n) return [];

  // how many raw points to skip per output point
  const step = n > maxPoints ? Math.ceil(n / maxPoints) : 1;

  const out = [];
  let dist = 0;

  // pull first point once
  let prev = points[0];
  let prevLat = prev.latitude ?? prev.lat;
  let prevLng = prev.longitude ?? prev.lon ?? prev.lng;

  // always include first point
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

    // accumulate distance on EVERY point
    if (
      lat === lat &&
      lng === lng &&
      prevLat === prevLat &&
      prevLng === prevLng
    ) {
      dist += haversineM(prevLat, prevLng, lat, lng);
    }

    // emit only every `step` points OR last point
    if (i % step === 0 || i === n - 1) {
      const eleRaw = p.elevation ?? p.ele ?? null;

      out.push({
        i, // original index (important for sync later)
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

export default function UploadGpx({ stageId, defaultType = "Bike" }) {
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
      setMessage("Please choose a GPX file.");
      return;
    }

    try {
      // Read once
      setStatus("uploading");
      setMessage("Reading + uploading GPX…");

      const xmlText = await file.text();

      // Parse GPX (stats + points)
      const [gpx, parseError] = parseGPX(xmlText);
      if (parseError) throw parseError;
      if (!gpx?.tracks?.length) throw new Error("No tracks found in GPX.");

      const track = gpx.tracks[0];
      const points = track?.points || [];
      if (!points.length) throw new Error("No track points found in GPX.");

      // Numeric stats from gpxjs (fallbacks)
      const distanceM = safeNum(track?.distance?.total);
      const elevationGainM = safeNum(track?.elevation?.positive);
      const elevationLossM = safeNum(track?.elevation?.negative);
      const elevationMaxM = safeNum(track?.elevation?.maximum);
      const elevationMinM = safeNum(track?.elevation?.minimum);
      const elevationAvgM = safeNum(track?.elevation?.average);

      // Optional times from first/last point if available
      const startTime = points[0]?.time ? new Date(points[0].time) : null;
      const endTime = points[points.length - 1]?.time
        ? new Date(points[points.length - 1].time)
        : null;

      // 1) Create activity (upload GPX + stats)
      const fdCreate = new FormData();
      fdCreate.append("stage", stageId);
      fdCreate.append("type", type);
      fdCreate.append("gpxFile", file);

      fdCreate.append("distanceM", String(distanceM));
      fdCreate.append("elevationGainM", String(elevationGainM));
      fdCreate.append("elevationLossM", String(elevationLossM));
      fdCreate.append("elevationMaxM", String(elevationMaxM));
      fdCreate.append("elevationMinM", String(elevationMinM));
      fdCreate.append("elevationAvgM", String(elevationAvgM));

      if (startTime) fdCreate.append("startTime", startTime.toISOString());
      if (endTime) fdCreate.append("endTime", endTime.toISOString());

      const activity = await pb.collection("activities").create(fdCreate);
      setCreatedActivity(activity);

      // 2) Convert + build derived outputs
      setStatus("converting");
      setMessage("Converting GPX → GeoJSON + profile…");

      const geojson = toGeoJSONFromXmlText(xmlText);

      // Simplify (tune tolerance later)
      const geojsonSmall = simplify(geojson, {
        tolerance: 0.00005, // ~5m-ish
        highQuality: false,
        mutate: false,
      });

      // Profile points (same point count as track points)
      const profile = buildProfileFromGpxTrackPoints(points);

      // 3) Update activity with generated files
      setMessage("Uploading GeoJSON + profile…");

      const fdUpdate = new FormData();

      fdUpdate.append(
        "geoJSON",
        new Blob([JSON.stringify(geojson)], { type: "application/geo+json" }),
        "route.geojson"
      );

      fdUpdate.append(
        "geoJSONSmall",
        new Blob([JSON.stringify(geojsonSmall)], {
          type: "application/geo+json",
        }),
        "route.small.geojson"
      );

      fdUpdate.append(
        "profile",
        new Blob([JSON.stringify(profile)], { type: "application/json" }),
        "profile.json"
      );

      const updated = await pb
        .collection("activities")
        .update(activity.id, fdUpdate);

      setCreatedActivity(updated);
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
      <h3>Upload activity</h3>

      <label style={{ display: "grid", gap: 6 }}>
        Activity type
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="Bike">Bike</option>
          <option value="Hike">Hike</option>
        </select>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        GPX file
        <input
          type="file"
          accept=".gpx,application/gpx+xml,text/xml,application/xml"
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
