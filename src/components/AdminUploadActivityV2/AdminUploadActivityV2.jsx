import { useState } from "react";
import s from "./AdminUploadActivityV2.module.css";
import { isGpxFile, isFitFile } from "../../lib/activities";
import {
  processGpxFileV2,
  processFitFileV2,
  createActivityV2,
  updateActivityFieldV2,
  describeError,
} from "../../lib/activitiesV2";

const SUB_STEPS = [
  { key: "geoJSON", label: "Route (geoJSON)" },
  { key: "geoJSONSmall", label: "Simplified route" },
  { key: "profile", label: "Elevation profile" },
];

export default function AdminUploadActivityV2({
  stageId,
  defaultType = "Bike",
  setActivities,
}) {
  const [type, setType] = useState(defaultType);
  const [files, setFiles] = useState([]);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [uploadOriginalFile, setUploadOriginalFile] = useState(true);

  const isUploading = uploadQueue.some((item) => item.status === "uploading");
  const canSubmit = !!stageId && files.length > 0 && !isUploading;

  function updateQueueItem(index, patch) {
    setUploadQueue((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function updateSubStep(index, key, patch) {
    setUploadQueue((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, subSteps: { ...item.subSteps, [key]: { ...item.subSteps[key], ...patch } } }
          : item,
      ),
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    const initialSubSteps = Object.fromEntries(
      SUB_STEPS.map((step) => [step.key, { status: "pending", message: "" }]),
    );
    const queue = files.map((file) => ({
      file,
      status: "pending",
      message: "",
      subSteps: initialSubSteps,
    }));
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

      let processed;
      try {
        processed = fileIsGpx ? await processGpxFileV2(file) : await processFitFileV2(file);
      } catch (err) {
        updateQueueItem(i, { status: "error", message: err?.message || "Could not read file." });
        continue;
      }

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

      let activity;
      try {
        const fdCreate = new FormData();
        fdCreate.append("stage", stageId);
        fdCreate.append("type", type);
        if (uploadOriginalFile) {
          fdCreate.append(fileIsGpx ? "gpxFile" : "fitFile", file);
        }
        fdCreate.append("distanceM", String(distanceM));
        fdCreate.append("elevationGainM", String(elevationGainM));
        fdCreate.append("elevationLossM", String(elevationLossM));
        fdCreate.append("elevationMaxM", String(elevationMaxM));
        fdCreate.append("elevationMinM", String(elevationMinM));
        fdCreate.append("elevationAvgM", String(elevationAvgM));
        if (startTime) fdCreate.append("startTime", startTime.toISOString());
        if (endTime) fdCreate.append("endTime", endTime.toISOString());

        activity = await createActivityV2(fdCreate);
      } catch (err) {
        updateQueueItem(i, { status: "error", message: "Create failed — " + describeError(err) });
        continue;
      }

      updateQueueItem(i, { message: "Uploading route files…" });
      setActivities((prev) => [activity, ...prev]);

      const fieldPayloads = {
        geoJSON: { blob: new Blob([JSON.stringify(geoJson)], { type: "application/geo+json" }), filename: "route.geojson" },
        geoJSONSmall: { blob: new Blob([JSON.stringify(geoJsonSmall)], { type: "application/geo+json" }), filename: "route.small.geojson" },
        profile: { blob: new Blob([JSON.stringify(profile)], { type: "application/json" }), filename: "profile.json" },
      };

      let latest = activity;
      let anyFailed = false;

      for (const step of SUB_STEPS) {
        updateSubStep(i, step.key, { status: "uploading", message: "" });
        try {
          const { blob, filename } = fieldPayloads[step.key];
          latest = await updateActivityFieldV2(activity.id, step.key, blob, filename);
          updateSubStep(i, step.key, { status: "done", message: "" });
          setActivities((prev) => prev.map((a) => (a.id === latest.id ? latest : a)));
        } catch (err) {
          anyFailed = true;
          updateSubStep(i, step.key, { status: "error", message: describeError(err) });
        }
      }

      updateQueueItem(i, {
        status: anyFailed ? "error" : "done",
        message: anyFailed
          ? "Activity created, but some files failed — see details below."
          : "Done",
      });
    }

    setFiles([]);
  }

  return (
    <form onSubmit={onSubmit} className={s.form}>
      <p className={s.hint}>
        Uploader v2 — more tolerant of messy GPS data and larger files, uploads
        route files separately so a single failure doesn't take the whole
        activity down, and shows the real error if something fails.
      </p>

      <div className={s.field}>
        <label htmlFor="activityTypeV2">Activity type</label>
        <select
          id="activityTypeV2"
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
        <label htmlFor="gpxFileV2">GPX / FIT files</label>
        <label className={s.fileInputLabel}>
          {files.length === 0 ? (
            "Tap to choose .gpx or .fit files"
          ) : (
            <span className={s.fileNames}>{files.map((f) => f.name).join(", ")}</span>
          )}
          <input
            id="gpxFileV2"
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

      <label className={s.field} style={{ flexDirection: "row", alignItems: "center", gap: "0.5em" }}>
        <input
          type="checkbox"
          checked={uploadOriginalFile}
          onChange={(e) => setUploadOriginalFile(e.target.checked)}
          disabled={isUploading}
        />
        Upload original .gpx/.fit file to PocketBase
      </label>
      {!uploadOriginalFile && (
        <p className={s.hint}>
          Original file will be skipped — only the route/profile data derived
          from it will be uploaded. Re-upload with this checked later to
          attach the source file once the upload issue is sorted out.
        </p>
      )}

      {uploadQueue.length > 0 && (
        <div className={s.queue}>
          {uploadQueue.map((item, i) => (
            <div key={i} className={s.queueItem} data-status={item.status}>
              <div className={s.queueHeader}>
                <span>{item.file.name}</span>
                <span className={s.queueMessage}>{item.message}</span>
              </div>
              {item.subSteps && (
                <div className={s.subSteps}>
                  {SUB_STEPS.map((step) => {
                    const sub = item.subSteps[step.key];
                    if (!sub || sub.status === "pending") return null;
                    return (
                      <div
                        key={step.key}
                        className={sub.status === "error" ? s.subStepError : s.subStepOk}
                      >
                        {step.label}: {sub.status === "uploading" ? "uploading…" : sub.status === "done" ? "done" : `failed — ${sub.message}`}
                      </div>
                    );
                  })}
                </div>
              )}
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
