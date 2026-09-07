import { useEffect, useRef } from "react";
import { formatStartTime, formatDuration } from "../../lib/stageFormatters";
import s from "./ActivityList.module.css";

import {
  ArrowUpRightIcon,
  ArrowsHorizontalIcon,
  ClockIcon,
} from "@phosphor-icons/react";
import { ACTIVITY_TYPE_ICONS } from "../../lib/activityTypes";

export default function ActivityList({
  activities,
  selectedActivity,
  setSelectedActivity,
}) {
  const selectedRef = useRef(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  }, [selectedActivity]);

  if (!activities?.length) return <></>;

  return (
    <div className={s.activityList}>
      {activities.map((activity) => (
        <button
          key={activity.id}
          ref={selectedActivity == activity.id ? selectedRef : null}
          className={`${s.activity} ${selectedActivity == activity.id ? s.selected : ""}`}
          onClick={() =>
            setSelectedActivity(
              selectedActivity === activity.id ? null : activity.id,
            )
          }
        >
          <div className={s.activityHeader}>
            {(() => {
              const TypeIcon = ACTIVITY_TYPE_ICONS[activity.type];
              return TypeIcon ? <TypeIcon width="18" /> : null;
            })()}
            <span>{formatStartTime(activity.startTime)}</span>
          </div>
          {/*
          <div className={s.activityData}>
            {activity.distanceM != null && (
              <div className={s.activityDataItem}>
                <ArrowsHorizontalIcon size="14" />
                <span>{(activity.distanceM / 1000).toFixed(1)} km</span>
              </div>
            )}
            {activity.elevationGainM != null && (
              <div className={s.activityDataItem}>
                <ArrowUpRightIcon size="14" />
                <span>{Math.round(activity.elevationGainM)} m</span>
              </div>
            )}
            {activity.startTime != null && (
              <div className={s.activityDataItem}>
                <ClockIcon size="14" />
                <span>
                  {formatDuration(
                    new Date(activity.endTime) - new Date(activity.startTime),
                  )}
                </span>
              </div>
            )}
          </div>
          */}
        </button>
      ))}
    </div>
  );
}
