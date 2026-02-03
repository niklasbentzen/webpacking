import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { pb } from "../lib/pb";
import StageMap from "../components/Map/StageMap";
import s from "./Stage.module.css";

import {
  formatDateRange,
  getStageDateRangeFromActivities,
  summarizeActivities,
} from "../lib/stages";
import Heightmap from "../components/Map/Heightmap";

export default function Stage() {
  const { slug } = useParams();
  const [stage, setStage] = useState([]);
  const [trip, setTrip] = useState(null);
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Idle");

  useEffect(() => {
    (async () => {
      try {
        setStatus("Loading...");
        const stageRes = await pb
          .collection("stages")
          .getFirstListItem(`slug='${slug}'`, {
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
      } catch (e) {
        console.error(e, e?.data);
        setError(e?.message || "Failed to load stage");
        setStatus(e?.message || "Error");
      }
    })();
  }, [slug]);

  const { start, end } = useMemo(
    () => getStageDateRangeFromActivities(activities),
    [activities]
  );

  const dateLabel = useMemo(() => formatDateRange(start, end), [start, end]);

  const summary = useMemo(() => summarizeActivities(activities), [activities]);

  return (
    <main className={s.stage}>
      {/* Map loads activities itself based on stage */}
      <div className={s.map}>
        <StageMap
          stage={stage}
          trip={trip}
          selectedActivity={selectedActivity}
          setSelectedActivity={setSelectedActivity}
          hoverIndex={hoverIndex}
          setHoverIndex={setHoverIndex}
        />
      </div>
      <div className={s.info}>
        <h1 style={{ color: "var(--p)" }}>{stage?.name ?? status}</h1>

        {dateLabel && <p>{dateLabel}</p>}

        {(summary.bikeCount > 0 ||
          summary.hikeCount > 0 ||
          summary.distanceM != null ||
          summary.elevationM != null ||
          summary.duration) && (
          <p>
            {summary.bikeCount > 0 && (
              <>
                🚴 {summary.bikeCount}
                {(summary.hikeCount > 0 ||
                  summary.distanceM != null ||
                  summary.elevationM != null ||
                  summary.duration) &&
                  " • "}
              </>
            )}

            {summary.hikeCount > 0 && (
              <>
                🚶 {summary.hikeCount}
                {(summary.distanceM != null ||
                  summary.elevationM != null ||
                  summary.duration) &&
                  " • "}
              </>
            )}

            {summary.distanceKm != null && (
              <>
                {summary.distanceM.toFixed(1)} km
                {(summary.elevationM != null || summary.duration) && " • "}
              </>
            )}

            {summary.elevationM != null && (
              <>
                {Math.round(summary.elevationM)} m{summary.duration && " • "}
              </>
            )}

            {summary.duration && <>{summary.duration}</>}
          </p>
        )}

        <h2>Activities</h2>
        {activities.length === 0 ? (
          <p>No activities found for this stage.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {activities.map((a) => {
              const aDateLabel = formatDateRange(a.startTime, a.endTime);

              return (
                <li key={a.id} style={{ padding: "12px 0" }}>
                  <div>
                    {a.type ? a.type : ""}
                    {a.type && aDateLabel ? " • " : ""}
                    {aDateLabel || ""}
                  </div>

                  {a.distanceKm || a.elevationM ? (
                    <div>
                      <div>
                        {a.distanceKm ? `${Math.round(a.distanceKm)} km` : ""}
                      </div>
                      <div>
                        {a.elevationM ? `${Math.round(a.elevationM)} m` : ""}
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className={s.body}>
        <Heightmap
          stage={stage}
          selectedActivity={selectedActivity}
          setSelectedActivity={setSelectedActivity}
          hoverIndex={hoverIndex}
          setHoverIndex={setHoverIndex}
        />
        <ReactMarkdown>
          {stage?.body ?? "No additional information for this stage."}
        </ReactMarkdown>
      </div>
    </main>
  );
}
