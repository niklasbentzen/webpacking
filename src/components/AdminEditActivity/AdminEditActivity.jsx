import { useState } from "react";
import s from "../../pages/admin/Admin.module.css";
import { toLocalInputValue } from "../../pages/admin/AdminStage";
import { updateActivity } from "../../lib/activities";

export default function AdminEditActivity({ activity, setActivities }) {
  const [type, setType] = useState(activity.type);

  const [startTime, setStartTime] = useState(
    toLocalInputValue(activity.startTime)
  );
  const [endTime, setEndTime] = useState(toLocalInputValue(activity.endTime));

  const [distanceM, setDistanceM] = useState(activity.distanceM);
  const [elevationGainM, setElevationGainM] = useState(activity.elevationGainM);
  const [elevationLossM, setElevationLossM] = useState(activity.elevationLossM);
  const [elevationMinM, setElevationMinM] = useState(activity.elevationMinM);
  const [elevationMaxM, setElevationMaxM] = useState(activity.elevationMaxM);

  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);

    try {
      const payload = {
        type, // ✅ now part of the payload
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        distanceM: Number(distanceM),
        elevationGainM: Number(elevationGainM),
        elevationLossM: Number(elevationLossM),
        elevationMinM: Number(elevationMinM),
        elevationMaxM: Number(elevationMaxM),
      };

      const updated = await updateActivity(activity.id, payload);

      setActivities((prev) =>
        prev.map((a) => (a.id === activity.id ? updated : a))
      );
    } catch (err) {
      console.error("Failed to update activity", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={s.modal}>
      <p>
        {type} {" on the "}
        {new Date(activity.startTime).toLocaleString(undefined, {
          month: "short",
          day: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}
      </p>

      <div className={s.field}>
        <label htmlFor="type">Type</label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          disabled={isSaving}
        >
          <option value="Bike">Bike</option>
          <option value="Hike">Hike</option>
          <option value="Ferry">Ferry</option>
          <option value="Train">Train</option>
          <option value="Bus">Bus</option>
        </select>
      </div>

      <div className={s.general}>
        <div className={s.field}>
          <label htmlFor="startTime">Start date & time</label>
          <input
            type="datetime-local"
            id="startTime"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            disabled={isSaving}
          />
        </div>

        <div className={s.field}>
          <label htmlFor="endTime">End date & time</label>
          <input
            type="datetime-local"
            id="endTime"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            disabled={isSaving}
          />
        </div>
      </div>

      <div className={s.field}>
        <label htmlFor="distanceM">Distance (Meters)</label>
        <input
          id="distanceM"
          type="number"
          value={distanceM}
          onChange={(e) => setDistanceM(e.target.value)}
          disabled={isSaving}
        />
      </div>

      <div className={s.general}>
        <div className={s.field}>
          <label htmlFor="elevationGainM">Elevation Gain (Meters)</label>
          <input
            id="elevationGainM"
            type="number"
            value={elevationGainM}
            onChange={(e) => setElevationGainM(e.target.value)}
            disabled={isSaving}
          />
        </div>
        <div className={s.field}>
          <label htmlFor="elevationLossM">Elevation Loss (Meters)</label>
          <input
            id="elevationLossM"
            type="number"
            value={elevationLossM}
            onChange={(e) => setElevationLossM(e.target.value)}
            disabled={isSaving}
          />
        </div>
      </div>

      <div className={s.general}>
        <div className={s.field}>
          <label htmlFor="elevationMinM">Elevation Min (Meters)</label>
          <input
            id="elevationMinM"
            type="number"
            value={elevationMinM}
            onChange={(e) => setElevationMinM(e.target.value)}
            disabled={isSaving}
          />
        </div>
        <div className={s.field}>
          <label htmlFor="elevationMaxM">Elevation Max (Meters)</label>
          <input
            id="elevationMaxM"
            type="number"
            value={elevationMaxM}
            onChange={(e) => setElevationMaxM(e.target.value)}
            disabled={isSaving}
          />
        </div>
      </div>

      <button onClick={handleSave} disabled={isSaving}>
        Save
      </button>
    </div>
  );
}
