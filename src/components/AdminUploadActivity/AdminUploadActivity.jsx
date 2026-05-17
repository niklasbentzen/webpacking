import { useState } from "react";
import s from "./AdminUploadActivity.module.css";
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
  setActivities,
}) {
  const [type, setType] = useState(defaultType);
  const [files, setFiles] = useState([]);
  const [uploadQueue, setUploadQueue] = useState([]);

  const isUploading = uploadQueue.some(
    (item) => item.status === "uploading",
  );
  const canSubmit = !!stageId && files.length > 0 && !isUploading;

  function updateQueueItem(index, patch) {
    setUploadQueue((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    const queue = files.map((file) => ({ file, status: "pending", message: "" }));
    setUploadQueue(queue);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileIsGpx = isGpxFile(file);
      const fileIsFit = isFitFile(file);

      if (!fileIsGpx && !fileIsFit) {
        updateQueueItem(i, {
          status: "error",
          message: "Unsupported format — use .gpx or .fit",
        });
        continue;
      }

      updateQueueItem(i, { status: "uploading", message: "Reading file…" });

      try {
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

        updateQueueItem(i, { message: "Creating activity…" });

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

        updateQueueItem(i, { message: "Uploading route…" });

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

        setActivities((prev) => [updated, ...prev]);
        updateQueueItem(i, { status: "done", message: "Done" });
      } catch (err) {
        console.error(err);
        updateQueueItem(i, {
          status: "error",
          message: err?.message || "Upload failed",
        });
      }
    }

    setFiles([]);
  }

  return (
    <form onSubmit={onSubmit} className={s.form}>
      <div className={s.field}>
        <label htmlFor="activityType">Activity type</label>
        <select
          id="activityType"
          value={type}
          onChange={(e) => setType(e.target.value)}
          disabled={isUploading}
        >
          <option value="Bike">Bike</option>
          <option value="Hike">Hike</option>
          <option value="Ferry">Ferry</option>
          <option value="Train">Train</option>
          <option value="Bus">Bus</option>
        </select>
      </div>

      <div className={s.field}>
        <label htmlFor="gpxFile">GPX / FIT files</label>
        <label className={s.fileInputLabel}>
          {files.length === 0 ? (
            "Tap to choose .gpx or .fit files"
          ) : (
            <span className={s.fileNames}>{files.map((f) => f.name).join(", ")}</span>
          )}
          <input
            id="gpxFile"
            className={s.hiddenInput}
            type="file"
            accept=".gpx,.fit,application/gpx+xml,text/xml,application/xml,application/octet-stream"
            multiple
            disabled={isUploading}
            onChange={(e) => {
              setFiles(Array.from(e.target.files || []));
              setUploadQueue([]);
            }}
          />
        </label>
      </div>

      {uploadQueue.length > 0 && (
        <div className={s.queue}>
          {uploadQueue.map((item, i) => (
            <div key={i} className={s.queueItem} data-status={item.status}>
              <span>{item.file.name}</span>
              <span className={s.queueMessage}>{item.message}</span>
            </div>
          ))}
        </div>
      )}

      <button type="submit" disabled={!canSubmit}>
        {isUploading
          ? `Uploading ${files.length > 1 ? `(${uploadQueue.filter((i) => i.status === "done").length}/${files.length})` : "…"}`
          : `Upload${files.length > 1 ? ` ${files.length} files` : ""}`}
      </button>
    </form>
  );
}
