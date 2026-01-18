import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { pb } from "../lib/pb";
import StageMap from "../components/StageMap";

import {
  formatDateRange,
  getStageDateRangeFromActivities,
  summarizeActivities,
} from "../lib/stages";

export default function Stage() {
  const { slug } = useParams();
  const [stage, setStage] = useState(null);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const stageRes = await pb
          .collection("stages")
          .getFirstListItem(`slug='${slug}'`);

        const activitiesRes = await pb.collection("activities").getFullList({
          filter: `stage = '${stageRes.id}'`,
          sort: "startTime",
        });

        setStage(stageRes);
        setActivities(activitiesRes);
      } catch (e) {
        console.error(e, e?.data);
        setError(e?.message || "Failed to load stage");
      }
    })();
  }, [slug]);

  const { start, end } = useMemo(
    () => getStageDateRangeFromActivities(activities),
    [activities]
  );

  const dateLabel = useMemo(() => formatDateRange(start, end), [start, end]);

  const summary = useMemo(() => summarizeActivities(activities), [activities]);

  if (error) return <p>{error}</p>;
  if (!stage) return <p>Loading…</p>;

  return (
    <article>
      {/* Map loads activities itself based on stage */}
      <StageMap stages={[stage]} />

      <h1>{stage.name}</h1>

      {dateLabel && <p>{dateLabel}</p>}

      {(summary.bikeCount > 0 ||
        summary.hikeCount > 0 ||
        summary.distanceKm != null ||
        summary.elevationM != null ||
        summary.duration) && (
        <p>
          {summary.bikeCount > 0 && (
            <>
              🚴 {summary.bikeCount}
              {(summary.hikeCount > 0 ||
                summary.distanceKm != null ||
                summary.elevationM != null ||
                summary.duration) &&
                " • "}
            </>
          )}

          {summary.hikeCount > 0 && (
            <>
              🚶 {summary.hikeCount}
              {(summary.distanceKm != null ||
                summary.elevationM != null ||
                summary.duration) &&
                " • "}
            </>
          )}

          {summary.distanceKm != null && (
            <>
              {summary.distanceKm.toFixed(1)} km
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

      <ReactMarkdown>{stage.body || ""}</ReactMarkdown>
    </article>
  );
}
