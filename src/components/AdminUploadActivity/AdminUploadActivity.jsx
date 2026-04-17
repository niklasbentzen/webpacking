import { useMemo, useState } from "react";
import {
  isGpxFile,
  isFitFile,
  processGpxFile,
  processFitFile,
  createActivity,
  updateActivityFiles,
} from "../../lib/activities";

export default function AdminUploadActivity({
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

      const processed = fileIsGpx
        ? await processGpxFile(file)
        : await processFitFile(file);

      const {
        geoJson,
        geoJsonSmall,
        profile,
        distanceM,
        elevationGainM,
        elevationLossM,
        elevationMaxM,
        elevationMinM,
        elevationAvgM,
        startTime,
        endTime,
      } = processed;

      setStatus("converting");
      setMessage("Creating activity in pb...");

      const fdCreate = new FormData();
      fdCreate.append("stage", stageId);
      fdCreate.append("type", type);
      fdCreate.append(fileIsGpx ? "gpxFile" : "fitFile", file);
      fdCreate.append("distanceM", String(distanceM));
      fdCreate.append("elevationGainM", String(elevationGainM));
      fdCreate.append("elevationLossM", String(elevationLossM));
      fdCreate.append("elevationMaxM", String(elevationMaxM));
      fdCreate.append("elevationMinM", String(elevationMinM));
      fdCreate.append("elevationAvgM", String(elevationAvgM));
      if (startTime) fdCreate.append("startTime", startTime.toISOString());
      if (endTime) fdCreate.append("endTime", endTime.toISOString());

      const activity = await createActivity(fdCreate);
      setCreatedActivity(activity);

      setMessage("Uploading GeoJSON + profile…");

      const fdUpdate = new FormData();
      fdUpdate.append(
        "geoJSON",
        new Blob([JSON.stringify(geoJson)], { type: "application/geo+json" }),
        "route.geojson",
      );
      fdUpdate.append(
        "geoJSONSmall",
        new Blob([JSON.stringify(geoJsonSmall)], { type: "application/geo+json" }),
        "route.small.geojson",
      );
      fdUpdate.append(
        "profile",
        new Blob([JSON.stringify(profile)], { type: "application/json" }),
        "profile.json",
      );

      const updated = await updateActivityFiles(activity.id, fdUpdate);

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
