import { formatStartTime } from "../../lib/stages";
import s from "./ActivityList.module.css";
import { formatDuration } from "../../lib/stages";

import {
  PersonSimpleBikeIcon,
  PersonSimpleHikeIcon,
  ArrowUpRightIcon,
  ArrowsHorizontalIcon,
  ClockIcon,
} from "@phosphor-icons/react";

const typeIcons = {
  Bike: <PersonSimpleBikeIcon width="18" />,
  Hike: <PersonSimpleHikeIcon width="18" />,
};

export default function ActivityList({
  activities,
  selectedActivity,
  setSelectedActivity,
}) {
  if (!activities?.length)
    return <p style={{ color: "var(--text-faded" }}>Found no activities...</p>;

  return (
    <ul className={s.activityList}>
      {activities.map((activity) => (
        <li
          key={activity.id}
          className={activity.id === selectedActivity ? ` ${s.selected}` : ""}
          onClick={() => setSelectedActivity(activity.id)}
        >
          <div className={s.activity}>
            <div className={s.activityHeader}>
              {typeIcons[activity.type]}
              <span>{formatStartTime(activity.startTime)}</span>
            </div>
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
                      new Date(activity.endTime) - new Date(activity.startTime)
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
