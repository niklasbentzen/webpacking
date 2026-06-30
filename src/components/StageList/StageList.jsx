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

import {
  formatDateRange,
  summarizeActivities,
} from "../../lib/stageFormatters";

export default function StageList({
  stages,
  clickedStage,
  setClickedStage,
  hoveredStage,
  setHoveredStage,
  scroll,
  sortOrder,
}) {
  const clickedElRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!clickedStage) return;
    if (!clickedElRef.current) return;
    if (window.innerWidth <= 960) return;

    const el = clickedElRef.current;
    const container = listRef.current;
    if (!container) return;

    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const isInView =
      elRect.top >= containerRect.top && elRect.bottom <= containerRect.bottom;
    if (!isInView) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
    }
  }, [clickedStage]);

  if (!stages?.length)
    return <i style={{ color: "var(--text-faded" }}>Found no stages...</i>;

  return (
    <ul className={`${s.stageList} ${scroll ? s.scroll : ""}`} ref={listRef}>
      {stages.map((stage) => {
          const stageActs = stage.expand?.activities_via_stage || [];
          const summary = summarizeActivities(stageActs);
          const dateLabel = formatDateRange(stage.startDate, stage.endDate);

          const isClicked = stage.id === clickedStage;
          const isHovered = stage.id === hoveredStage;

          return (
            <li key={stage.id} ref={isClicked ? clickedElRef : null}>
              <a
                className={`${s.stageItem} ${isClicked ? s.clickedStage : ""} ${isHovered ? s.hoveredStage : ""}`}
                onClick={() => setClickedStage(stage.id)}
                onMouseEnter={() => setHoveredStage?.(stage.id)}
                onMouseLeave={() => setHoveredStage?.(null)}
              >
                <div className={s.sparkline}>
                  <Sparkline key={`${stage.id}-${sortOrder}`} activities={stageActs} />
                </div>

                <div className={s.col}>
                  {dateLabel && <span className="label">{dateLabel}</span>}

                  <h3 className={s.stageTitle}>{stage.name}</h3>

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
              </a>
            </li>
          );
        })}
    </ul>
  );
}
