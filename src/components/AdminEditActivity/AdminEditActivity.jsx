import { useEffect, useState } from "react";
import s from "../../pages/admin/Admin.module.css";
import { toLocalInputValue } from "../../pages/admin/AdminStage";
import { updateActivity } from "../../lib/activities";
import { fetchStatisticsForTrip } from "../../lib/statistics";
import {
  fetchActivityStatsForActivity,
  upsertActivityStat,
} from "../../lib/activityStats";

export default function AdminEditActivity({ activity, setActivities, tripId }) {
  const [type, setType] = useState(activity.type);

  const [startTime, setStartTime] = useState(
    toLocalInputValue(activity.startTime),
  );
  const [endTime, setEndTime] = useState(toLocalInputValue(activity.endTime));

  const [distanceM, setDistanceM] = useState(activity.distanceM);
  const [elevationGainM, setElevationGainM] = useState(activity.elevationGainM);
  const [elevationLossM, setElevationLossM] = useState(activity.elevationLossM);
  const [elevationMinM, setElevationMinM] = useState(activity.elevationMinM);
  const [elevationMaxM, setElevationMaxM] = useState(activity.elevationMaxM);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [statistics, setStatistics] = useState([]);
  const [activityStats, setActivityStats] = useState([]);

  useEffect(() => {
    if (!tripId || !activity?.id) return;
    let cancelled = false;

    async function loadStats() {
      try {
        const [stats, aStats] = await Promise.all([
          fetchStatisticsForTrip(tripId),
          fetchActivityStatsForActivity(activity.id),
        ]);
        if (cancelled) return;
        setStatistics(stats);
        setActivityStats(aStats);
      } catch (err) {
        console.error(err);
      }
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, [tripId, activity?.id]);

  function getCount(statisticId) {
    const match = activityStats.find((as) => as.statistic === statisticId);
    return match?.count ?? 0;
  }

  async function handleCountChange(statisticId, value) {
    const count = Math.max(0, parseInt(value, 10) || 0);
    try {
      const updated = await upsertActivityStat(activity.id, statisticId, count);
      setActivityStats((prev) => {
        const idx = prev.findIndex((as) => as.statistic === statisticId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], count };
          return next;
        }
        return [...prev, { ...updated, statistic: statisticId, count }];
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveError("");

    try {
      const payload = {
        type,
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
        prev.map((a) => (a.id === activity.id ? updated : a)),
      );
    } catch {
      setSaveError("Could not save activity.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={s.modal}>
      <p>
        {type}
        {" on "}
        {new Date(activity.startTime).toLocaleString(undefined, {
          month: "short",
          day: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "UTC",
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
          <label htmlFor="startTime">Start</label>
          <input
            type="datetime-local"
            id="startTime"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            disabled={isSaving}
          />
        </div>

        <div className={s.field}>
          <label htmlFor="endTime">End</label>
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
        <label htmlFor="distanceM">Distance (m)</label>
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
          <label htmlFor="elevationGainM">Elevation gain (m)</label>
          <input
            id="elevationGainM"
            type="number"
            value={elevationGainM}
            onChange={(e) => setElevationGainM(e.target.value)}
            disabled={isSaving}
          />
        </div>
        <div className={s.field}>
          <label htmlFor="elevationLossM">Elevation loss (m)</label>
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
          <label htmlFor="elevationMinM">Elevation min (m)</label>
          <input
            id="elevationMinM"
            type="number"
            value={elevationMinM}
            onChange={(e) => setElevationMinM(e.target.value)}
            disabled={isSaving}
          />
        </div>
        <div className={s.field}>
          <label htmlFor="elevationMaxM">Elevation max (m)</label>
          <input
            id="elevationMaxM"
            type="number"
            value={elevationMaxM}
            onChange={(e) => setElevationMaxM(e.target.value)}
            disabled={isSaving}
          />
        </div>
      </div>

      {statistics.length > 0 && (
        <div className={s.section}>
          <label>Statistics</label>
          {statistics.map((stat) => (
            <div key={stat.id} className={s.general}>
              <span className={s.statsActivityLabel}>{stat.name}</span>
              <input
                className={s.statsInput}
                type="number"
                min="0"
                defaultValue={getCount(stat.id)}
                onBlur={(e) => handleCountChange(stat.id, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      {statistics.length === 0 && tripId && (
        <p className={s.statsEmpty}>No statistics defined for this trip.</p>
      )}
      <div className={s.row}>
        <button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </button>
        {saveError && <span className={s.statusError}>{saveError}</span>}
      </div>
    </div>
  );
}
