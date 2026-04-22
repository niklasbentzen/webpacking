import { useEffect, useMemo, useState } from "react";

import ActivityList from "../ActivityList/ActivityList";
import Heightmap from "../Map/Heightmap";
import { summarizeActivities } from "../../lib/stageFormatters";

import s from "./StageActivityPanel.module.css";

export default function StageActivityPanel({
  stage,
  mapRef,
  selectedActivity: selectedActivityProp,
  setSelectedActivity: setSelectedActivityProp,
}) {
  const activities = stage?.expand?.activities_via_stage ?? [];

  const [selectedActivityInternal, setSelectedActivityInternal] = useState(
    activities[0]?.id ?? null,
  );

  const isControlled = selectedActivityProp !== undefined;
  const selectedActivity = isControlled
    ? selectedActivityProp
    : selectedActivityInternal;
  const setSelectedActivity = isControlled
    ? setSelectedActivityProp
    : setSelectedActivityInternal;

  useEffect(() => {
    if (!isControlled) {
      setSelectedActivityInternal(activities[0]?.id ?? null);
    }
  }, [stage?.id]);

  const activityData = activities.find((a) => a.id === selectedActivity);
  const summary = useMemo(
    () => summarizeActivities(activityData ? [activityData] : []),
    [activityData],
  );

  if (!activities.length) return null;

  return (
    <div className={s.panel}>
      {activities.length > 1 && (
        <ActivityList
          activities={activities}
          selectedActivity={selectedActivity}
          setSelectedActivity={setSelectedActivity}
        />
      )}

      <Heightmap
        stage={stage}
        selectedActivity={selectedActivity}
        setSelectedActivity={setSelectedActivity}
        onHoverPoint={(pt) => mapRef?.current?.setHoverPoint(pt)}
        onHoverEnd={() => mapRef?.current?.clearHover()}
        height={120}
        padding="10px"
      />

      <div className={s.stats}>
        {activityData?.type != null && (
          <div className={s.statItem}>
            <p>Activity type</p>
            <span className={s.statValue}>{activityData?.type}</span>
          </div>
        )}
        {summary.distanceM != null && (
          <div className={s.statItem}>
            <p>Distance</p>
            <span className={s.statValue}>
              {(summary.distanceM / 1000).toFixed(1)} km
            </span>
          </div>
        )}
        {summary.elevationM != null && (
          <div className={s.statItem}>
            <p>Elevation gain</p>
            <span className={s.statValue}>
              {Math.round(summary.elevationM)} m
            </span>
          </div>
        )}
        {summary.duration && (
          <div className={s.statItem}>
            <p>Total duration</p>
            <span className={s.statValue}>{summary.duration}</span>
          </div>
        )}
      </div>
    </div>
  );
}
