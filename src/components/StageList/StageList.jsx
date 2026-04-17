import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import Sparkline from "../Sparkline/Sparkline";
import s from "./StageList.module.css";

import {
  PersonSimpleBikeIcon,
  PersonSimpleHikeIcon,
  ArrowsHorizontalIcon,
  ClockIcon,
} from "@phosphor-icons/react";

import { formatDateRange, summarizeActivities } from "../../lib/stageFormatters";

export default function StageList({
  stages,
  clickedStage,
  setClickedStage,
  hoveredStage,
  setHoveredStage,
}) {
  const clickedElRef = useRef(null);

  useEffect(() => {
    if (!clickedStage) return;
    if (!clickedElRef.current) return;

    clickedElRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "nearest",
    });
  }, [clickedStage]);

  if (!stages?.length)
    return <i style={{ color: "var(--text-faded" }}>Found no stages...</i>;

  return (
    <ul className={s.stageList}>
      {[...stages]
        .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
        .map((stage) => {
          const stageActs = stage.expand?.activities_via_stage || [];
          const summary = summarizeActivities(stageActs);
          const dateLabel = formatDateRange(stage.startDate, stage.endDate);

          const isClicked = stage.id === clickedStage;
          const isHovered = stage.id === hoveredStage;

          return (
            <li key={stage.id} ref={isClicked ? clickedElRef : null}>
              <div
                className={`${s.stageItem} ${isClicked ? s.clickedStage : ""} ${isHovered ? s.hoveredStage : ""}`}
                onMouseEnter={() => setHoveredStage?.(stage.id)}
                onMouseLeave={() => setHoveredStage?.(null)}
              >
                <div
                  className={s.sparkline}
                  onClick={() => setClickedStage(stage.id)}
                >
                  <Sparkline activities={stageActs} />
                </div>

                <div className={s.col}>
                  {dateLabel && <label>{dateLabel}</label>}
                  <Link to={`/stages/${stage.slug}`}>
                    <h3 className={s.stageTitle}>{stage.name}</h3>
                  </Link>

                  {stageActs.length > 0 && (
                    <div className={s.stageData}>
                      <div className={s.stageDataType}>
                        {summary.bikeCount > 0 && (
                          <div
                            className={`${s.stageDataItem} ${s.activityCount}`}
                          >
                            <PersonSimpleBikeIcon size="18" />
                            <span>{summary.bikeCount}</span>
                          </div>
                        )}
                        {summary.hikeCount > 0 && (
                          <div
                            className={`${s.stageDataItem} ${s.activityCount}`}
                          >
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
              </div>
            </li>
          );
        })}
    </ul>
  );
}
