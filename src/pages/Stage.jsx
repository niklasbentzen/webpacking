import { useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { pb } from "../lib/pb";
import StageMap from "../components/Map/StageMap";
import ActivityList from "../components/ActivityList/ActivityList";
import s from "./Stage.module.css";
import Divider from "../components/Divider/Divider";

import {
  formatDateRange,
  getStageDateRangeFromActivities,
  summarizeActivities,
} from "../lib/stages";
import Heightmap from "../components/Map/Heightmap";

import {
  PersonSimpleBikeIcon,
  PersonSimpleHikeIcon,
  ArrowUpRightIcon,
  ArrowsHorizontalIcon,
  ClockIcon,
} from "@phosphor-icons/react";
import Map from "../components/Map/Map";
import StageLayers from "../components/Map/StageLayers";
import PlannedRoute from "../components/Map/PlannedRoute";

export default function Stage() {
  const { slug } = useParams();
  const [stage, setStage] = useState([]);
  const [trip, setTrip] = useState(null);
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Idle");
  const mapRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        setStatus("Loading...");
        const stageRes = await pb
          .collection("stages")
          .getFirstListItem(`slug='${slug}'`, {
            sort: "-startDate",
            expand: "trip,activities_via_stage",
          });

        const activitiesRes = await pb.collection("activities").getFullList({
          filter: `stage = '${stageRes.id}'`,
          sort: "startTime",
          expand: "trip_via_stage",
        });

        setStage(stageRes);
        setTrip(stageRes.expand?.trip || null);
        setActivities(activitiesRes);

        if (activitiesRes.length == 1) {
          setSelectedActivity(activitiesRes[0].id);
        }
        console.log("Loaded stage", stageRes, activitiesRes);
      } catch (e) {
        console.error(e, e?.data);
        setError(e?.message || "Failed to load stage");
        setStatus(e?.message || "Error");
      }
    })();
  }, [slug]);

  const dateLabel = useMemo(
    () => formatDateRange(stage?.startDate, stage?.startDate),
    [stage?.startDate, stage?.startDate]
  );
  const summary = useMemo(() => summarizeActivities(activities), [activities]);

  return (
    <main className={s.stage}>
      {activities.length > 0 && (
        <div className={s.map}>
          <Map ref={mapRef}>
            <StageLayers
              stage={stage}
              selectedActivity={selectedActivity}
              setSelectedActivity={setSelectedActivity}
              fitBounds
              padding={[20, 20]}
            />
            {trip && <PlannedRoute trip={trip} />}
          </Map>

          <div className={s.heightmap}>
            <Heightmap
              stage={stage}
              selectedActivity={selectedActivity}
              setSelectedActivity={setSelectedActivity}
              onHoverPoint={(pt) => mapRef.current?.setHoverPoint(pt)}
              onHoverEnd={() => mapRef.current?.clearHover()}
            />
          </div>
        </div>
      )}

      <div className={s.info}>
        {dateLabel && <p>{dateLabel}</p>}
        <h1 style={{ color: "var(--p)" }}>{stage?.name ?? status}</h1>

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

        {activities.length > 1 && (
          <>
            <Divider />

            <h3>Activities</h3>

            <ActivityList
              activities={activities}
              selectedActivity={selectedActivity}
              setSelectedActivity={setSelectedActivity}
            />
          </>
        )}
      </div>

      <div className={s.return}>
        <Link to={`/trips/${trip?.slug}`}>← Go back</Link>
      </div>

      <div className={s.body}>
        <ReactMarkdown>
          {stage?.body ?? "No additional information for this stage."}
        </ReactMarkdown>
      </div>
    </main>
  );
}
