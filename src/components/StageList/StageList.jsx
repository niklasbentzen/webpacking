import { Link } from "react-router-dom";
import Sparkline from "../Sparkline/Sparkline";
import s from "./StageList.module.css";

import {
  PersonSimpleBikeIcon,
  PersonSimpleHikeIcon,
  ArrowUpRightIcon,
  ArrowsHorizontalIcon,
  ClockIcon,
} from "@phosphor-icons/react";

import {
  formatDateRange,
  getStageDateRangeFromActivities,
  summarizeActivities,
} from "../../lib/stages";

export default function StageList({ stages, clickedStage }) {
  if (!stages?.length)
    return <i style={{ color: "var(--text-faded" }}>Found no stages...</i>;

  return (
    <ul className={s.stageList}>
      {[...stages]
        .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
        .map((stage) => {
          const stageActs = stage.expand?.activities_via_stage || [];

          const summary = summarizeActivities(stageActs);
          const { start, end } = getStageDateRangeFromActivities(stageActs);
          const dateLabel = formatDateRange(stage.startDate, stage.endDate);

          return (
            <li key={stage.id}>
              <Link
                className={`${s.stageItem} ${
                  stage.id === clickedStage ? s.clickedStage : ""
                }`}
                to={`/stages/${stage.slug}`}
              >
                <Sparkline activities={stageActs} />

                <div className={s.col}>
                  {dateLabel && <label>{dateLabel}</label>}

                  <h3 className={s.stageTitle}>{stage.name}</h3>
                  {stageActs.length > 0 && (
                    <div className={s.stageData}>
                      <div className={s.stageDataType}>
                        {summary.bikeCount > 0 && (
                          <div className={(s.stageDataItem, s.activityCount)}>
                            <PersonSimpleBikeIcon size="18" />
                            <span>{summary.bikeCount}</span>
                          </div>
                        )}
                        {summary.hikeCount > 0 && (
                          <div className={(s.stageDataItem, s.activityCount)}>
                            <PersonSimpleHikeIcon size="18" />
                            <span>{summary.hikeCount}</span>
                          </div>
                        )}
                      </div>

                      {summary.distanceM != null && (
                        <div className={s.stageDataItem}>
                          <ArrowsHorizontalIcon size="14" />
                          {(summary.distanceM / 1000).toFixed(1)} km
                        </div>
                      )}

                      {summary.duration && (
                        <div className={s.stageDataItem}>
                          <ClockIcon size="14" />
                          {summary.duration}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
    </ul>
  );
}
