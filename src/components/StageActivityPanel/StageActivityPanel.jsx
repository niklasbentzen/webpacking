import { useEffect, useMemo, useState } from "react";

import ActivityList from "../ActivityList/ActivityList";
import Heightmap from "../Map/Heightmap";
import { summarizeActivities } from "../../lib/stageFormatters";

import {
  PersonSimpleBikeIcon,
  PersonSimpleHikeIcon,
  ArrowUpRightIcon,
  ArrowsHorizontalIcon,
  ClockIcon,
} from "@phosphor-icons/react";

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
      <h3 className={s.stageName}>{stage?.name}</h3>

      {activities.length > 1 && (
        <ActivityList
          activities={activities}
          selectedActivity={selectedActivity}
          setSelectedActivity={setSelectedActivity}
        />
      )}

      <div className={s.stats}>
        {activityData?.type === "Bike" && (
          <div className={s.statItem}>
            <PersonSimpleBikeIcon size={14} />
          </div>
        )}
        {activityData?.type === "Hike" && (
          <div className={s.statItem}>
            <PersonSimpleHikeIcon size={14} />
          </div>
        )}
        {summary.distanceM != null && (
          <div className={s.statItem}>
            <ArrowsHorizontalIcon size={14} />
            {(summary.distanceM / 1000).toFixed(1)} km
          </div>
        )}
        {summary.elevationM != null && (
          <div className={s.statItem}>
            <ArrowUpRightIcon size={14} />
            {Math.round(summary.elevationM)} m
          </div>
        )}
        {summary.duration && (
          <div className={s.statItem}>
            <ClockIcon size={14} />
            {summary.duration}
          </div>
        )}
      </div>

      <Heightmap
        stage={stage}
        selectedActivity={selectedActivity}
        setSelectedActivity={setSelectedActivity}
        onHoverPoint={(pt) => mapRef?.current?.setHoverPoint(pt)}
        onHoverEnd={() => mapRef?.current?.clearHover()}
        height={100}
        padding="0"
      />
    </div>
  );
}
