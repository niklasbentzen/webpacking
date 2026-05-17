import { useEffect, useMemo, useState } from "react";
import s from "../../pages/admin/Admin.module.css";
import { TrashIcon } from "@phosphor-icons/react";
import {
  fetchStatisticsForTrip,
  createStatistic,
  deleteStatistic,
} from "../../lib/statistics";
import {
  fetchActivityStatsForTrip,
  upsertActivityStat,
} from "../../lib/activityStats";

export default function AdminStageStats({ tripId, activities, showCounts = true }) {
  const [statistics, setStatistics] = useState([]);
  const [activityStats, setActivityStats] = useState([]);
  const [newStatName, setNewStatName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const [stats, aStats] = await Promise.all([
          fetchStatisticsForTrip(tripId),
          showCounts ? fetchActivityStatsForTrip(tripId) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setStatistics(stats);
        setActivityStats(aStats);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tripId, showCounts]);

  const activityIds = useMemo(
    () => new Set((activities || []).map((a) => a.id)),
    [activities],
  );

  const stageActivityStats = useMemo(
    () => activityStats.filter((as) => activityIds.has(as.activity)),
    [activityStats, activityIds],
  );

  const totals = useMemo(
    () =>
      stageActivityStats.reduce((acc, as) => {
        acc[as.statistic] = (acc[as.statistic] || 0) + (as.count || 0);
        return acc;
      }, {}),
    [stageActivityStats],
  );

  function getCount(activityId, statisticId) {
    const match = activityStats.find(
      (as) => as.activity === activityId && as.statistic === statisticId,
    );
    return match?.count ?? 0;
  }

  async function handleAddStat(e) {
    e.preventDefault();
    const name = newStatName.trim();
    if (!name || !tripId) return;

    setIsAdding(true);
    try {
      const created = await createStatistic(tripId, name);
      setStatistics((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewStatName("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDeleteStat(statisticId) {
    const ok = window.confirm("Delete this statistic? All recorded counts will be lost.");
    if (!ok) return;
    try {
      await deleteStatistic(statisticId);
      setStatistics((prev) => prev.filter((st) => st.id !== statisticId));
      setActivityStats((prev) => prev.filter((as) => as.statistic !== statisticId));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCountChange(activityId, statisticId, value) {
    const count = Math.max(0, parseInt(value, 10) || 0);
    try {
      const updated = await upsertActivityStat(activityId, statisticId, count);
      setActivityStats((prev) => {
        const idx = prev.findIndex(
          (as) => as.activity === activityId && as.statistic === statisticId,
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], count };
          return next;
        }
        return [...prev, { ...updated, activity: activityId, statistic: statisticId, count }];
      });
    } catch (err) {
      console.error(err);
    }
  }

  if (isLoading) return <p className={s.statsEmpty}>Loading…</p>;

  return (
    <div className={s.section}>
      <div className={s.statChips}>
        {statistics.map((stat) => (
          <div key={stat.id} className={s.statChip}>
            <span>{stat.name}</span>
            <div
              className={s.iconButton}
              onClick={() => handleDeleteStat(stat.id)}
              title="Delete statistic"
            >
              <TrashIcon size={12} />
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleAddStat} className={s.addStatRow}>
        <input
          className={s.addStatInput}
          type="text"
          placeholder="New statistic (e.g. Punctures)"
          value={newStatName}
          onChange={(e) => setNewStatName(e.target.value)}
          disabled={isAdding}
        />
        <button
          type="submit"
          className={s.secondary}
          disabled={!newStatName.trim() || isAdding}
        >
          Add
        </button>
      </form>

      {showCounts && statistics.length > 0 && activities?.length > 0 && (
        <div className={s.statsGrid}>
          <div className={s.statsHeaderRow}>
            <span className={s.statsActivityLabel}>Activity</span>
            {statistics.map((stat) => (
              <span key={stat.id} className={s.statsColLabel}>{stat.name}</span>
            ))}
          </div>

          {activities.map((activity) => (
            <div key={activity.id} className={s.statsRow}>
              <span className={s.statsActivityLabel}>
                {new Date(activity.startTime).toLocaleString(undefined, {
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
                {" · "}
                {activity.type}
              </span>
              {statistics.map((stat) => (
                <input
                  key={stat.id}
                  className={s.statsInput}
                  type="number"
                  min="0"
                  defaultValue={getCount(activity.id, stat.id)}
                  onBlur={(e) => handleCountChange(activity.id, stat.id, e.target.value)}
                />
              ))}
            </div>
          ))}

          <div className={s.statsTotals}>
            {statistics.map((stat) => (
              <span key={stat.id}>{stat.name}: {totals[stat.id] ?? 0}</span>
            ))}
          </div>
        </div>
      )}

      {showCounts && statistics.length === 0 && (
        <p className={s.statsEmpty}>No statistics defined for this trip yet.</p>
      )}
    </div>
  );
}
