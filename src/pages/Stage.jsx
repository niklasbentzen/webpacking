import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";

import s from "./Stage.module.css";

import { fetchStageBySlug } from "../lib/stages";
import {
  formatDateRange,
  summarizeActivities,
} from "../lib/stageFormatters";
import { fetchActivitiesForStage } from "../lib/activities";
import { fetchHaikuFromStageId } from "../lib/haiku";

import {
  ArrowUpRightIcon,
  ArrowsHorizontalIcon,
  ClockIcon,
} from "@phosphor-icons/react";
import StageActivityPanel from "../components/StageActivityPanel/StageActivityPanel";
import { ACTIVITY_TYPES, ACTIVITY_TYPE_ICONS } from "../lib/activityTypes";

const ACTIVITY_TYPE_COUNT_KEYS = {
  Bike: "bikeCount",
  Hike: "hikeCount",
  Ferry: "ferryCount",
  Train: "trainCount",
  Bus: "busCount",
};

export default function Stage() {
  const { slug } = useParams();
  const [stage, setStage] = useState([]);
  const [trip, setTrip] = useState(null);
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [haikus, setHaikus] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Idle");

  useEffect(() => {
    (async () => {
      try {
        setStatus("Loading...");
        const stageRes = await fetchStageBySlug(slug);
        const [activitiesRes, haikusRes] = await Promise.all([
          fetchActivitiesForStage(stageRes.id),
          fetchHaikuFromStageId(stageRes.id),
        ]);

        setStage(stageRes);
        setTrip(stageRes.expand?.trip || null);
        setActivities(activitiesRes);
        setHaikus(haikusRes);
      } catch (e) {
        console.error(e, e?.data);
        setError(e?.message || "Failed to load stage");
        setStatus(e?.message || "Error");
      }
    })();
  }, [slug]);

  const dateLabel = useMemo(
    () => formatDateRange(stage?.startDate, stage?.startDate),
    [stage?.startDate, stage?.startDate],
  );
  const summary = useMemo(
    () => summarizeActivities(activities, { bikeOnly: true }),
    [activities],
  );

  return (
    <main className={s.stage}>
      <div className={s.title}>
        {dateLabel && <p>{dateLabel}</p>}
        <h1>{stage?.name ?? status}</h1>
        <div className={s.stageData}>
          <div className={s.stageDataType}>
            {ACTIVITY_TYPES.map((type) => {
              const count = summary[ACTIVITY_TYPE_COUNT_KEYS[type]];
              if (!count) return null;
              const TypeIcon = ACTIVITY_TYPE_ICONS[type];
              return (
                <div key={type} className={(s.stageDataItem, s.activityCount)}>
                  <TypeIcon size="18" />
                  <span>{count}</span>
                </div>
              );
            })}
          </div>

          {summary.distanceM != null && (
            <div className={s.stageDataItem}>
              <ArrowsHorizontalIcon size="14" />
              {(summary.distanceM / 1000).toFixed(1)} km
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

      <div className={s.body}>
        <ReactMarkdown>
          {stage?.body ?? "No additional information for this stage."}
        </ReactMarkdown>
      </div>

      <div className={s.sidebar}>
        {haikus.length > 0 && (
          <div className={s.haikus}>
            {haikus.map((haiku) => (
              <div className={s.haiku}>
                <label>
                  {new Date(haiku.date).toLocaleDateString("en-GB", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </label>
                <p style={{ whiteSpace: "pre-line" }}>{haiku.text}</p>
              </div>
            ))}
          </div>
        )}

        <StageActivityPanel
          stage={stage}
          activities={activities}
          selectedActivity={selectedActivity}
          setSelectedActivity={setSelectedActivity}
        />
      </div>
    </main>
  );
}
