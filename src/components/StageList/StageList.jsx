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

export default function StageList({ stages }) {
  if (!stages?.length) return null;

  return (
    <ul className={s.stageList}>
      {stages.map((stage) => {
        const stageActs = stage.expand?.activities_via_stage || [];

        const summary = summarizeActivities(stageActs);
        const { start, end } = getStageDateRangeFromActivities(stageActs);
        const dateLabel = formatDateRange(start, end);

        return (
          <li key={stage.id}>
            <Link className={s.stageItem} to={`/stages/${stage.slug}`}>
              <Sparkline activities={stageActs} />

              <div className={s.col}>
                {dateLabel && <label>{dateLabel}</label>}

                <h3 className={s.stageTitle}>{stage.name}</h3>

                <div className={s.stageData}>
                  <div>
                    {summary.bikeCount > 0 && (
                      <div className="flex-row center">
                        <PersonSimpleBikeIcon size="18" /> {summary.bikeCount}
                      </div>
                    )}
                    {summary.hikeCount > 0 && (
                      <div className="flex-row center">
                        <PersonSimpleHikeIcon size="18" /> {summary.hikeCount}
                      </div>
                    )}
                  </div>

                  {summary.distanceKm != null && (
                    <div className={s.stageDataItem}>
                      <ArrowsHorizontalIcon size="14" />
                      {summary.distanceKm.toFixed(1)} km
                    </div>
                  )}

                  {summary.elevationM != null && (
                    <div className={s.stageDataItem}>
                      <ArrowUpRightIcon size="14" />
                      {Math.round(summary.elevationM)} m
                    </div>
                  )}

                  {summary.duration && (
                    <div className={s.stageDataItem}>
                      <ClockIcon size="14" />
                      {summary.duration}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
