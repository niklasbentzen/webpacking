import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import TripMap from "../components/TripMap/TripMap";
import StageList from "../components/StageList/StageList";

import s from "./Trip.module.css";

import {
  PersonSimpleBikeIcon,
  PersonSimpleHikeIcon,
  ArrowUpRightIcon,
  ArrowsHorizontalIcon,
  ClockIcon,
  LineSegmentIcon,
  LineSegmentsIcon,
} from "@phosphor-icons/react";

import {
  fetchTripBySlug,
  fetchStagesForTripWithActivities,
  summarizeTripFromStages,
} from "../lib/trips";

export default function Trip() {
  const { slug } = useParams();
  const [trip, setTrip] = useState(null);
  const [stages, setStages] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const tripRes = await fetchTripBySlug(slug);
        const stageRes = await fetchStagesForTripWithActivities(tripRes.id);

        setTrip(tripRes);
        setStages(stageRes);
      } catch (e) {
        console.error(e, e?.data);
        setError(e?.message || "Failed to load trip");
      }
    })();
  }, [slug]);

  const totals = useMemo(() => summarizeTripFromStages(stages), [stages]);

  if (error) return <p>{error}</p>;
  if (!trip) return <p>Loading…</p>;

  return (
    <main className={s.trip}>
      <section>
        {stages.length > 0 && <TripMap stages={stages} trip={trip} />}
        <div>
          <h1>{trip.name}</h1>
          {trip.description && <p>{trip.description}</p>}
        </div>
      </section>

      <aside className={s.sidebar}>
        <div>
          <h3>Summary</h3>
          <div className={s.tripData}>
            {totals.stageCount != null && (
              <div className={s.tripDataItem}>
                <LineSegmentsIcon size="14" />
                {totals.stageCount} stages
              </div>
            )}
            {totals.activityCount != null && (
              <div className={s.tripDataItem}>
                <LineSegmentIcon size="14" />
                {totals.activityCount} activities
              </div>
            )}
            {totals.distanceKm != null && (
              <div className={s.tripDataItem}>
                <ArrowsHorizontalIcon size="14" />
                {totals.distanceKm} km
              </div>
            )}
            {totals.elevationM != null && (
              <div className={s.tripDataItem}>
                <ArrowUpRightIcon size="14" />
                {totals.elevationM} m
              </div>
            )}
          </div>
        </div>

        <h3>Stages</h3>
        <StageList stages={stages} />
      </aside>
    </main>
  );
}
