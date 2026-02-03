import { act, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import TripMap from "../components/Map/TripMap";
import StageList from "../components/StageList/StageList";
import Divider from "../components/Divider/Divider";

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
  const [clickedStage, setClickedStage] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Idle");

  useEffect(() => {
    setStatus("Loading...");
    (async () => {
      try {
        const tripRes = await fetchTripBySlug(slug);
        const stageRes = await fetchStagesForTripWithActivities(tripRes.id);

        setTrip(tripRes);
        setStages(stageRes);
      } catch (e) {
        console.error(e, e?.data);
        setError(e?.message || "Failed to load trip");
        setStatus(e?.message || "Error");
      }
    })();
  }, [slug]);

  const totals = useMemo(() => summarizeTripFromStages(stages), [stages]);

  return (
    <main className={s.trip}>
      <div className={s.map}>
        {
          <TripMap
            stages={stages}
            trip={trip}
            setClickedStage={setClickedStage}
            clickedStage={clickedStage}
          />
        }
      </div>
      <div className={s.info}>
        <h1 style={{ color: "var(--p)" }}>{trip?.name ?? status}</h1>
        {trip?.description && <p>{trip.description}</p>}
      </div>

      <div className={s.stages}>
        <section>
          <h2>Summary</h2>
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
            {totals.distanceM != null && (
              <div className={s.tripDataItem}>
                <ArrowsHorizontalIcon size="14" />
                <span>{totals.distanceM} km</span>
              </div>
            )}
            {totals.elevationM != null && (
              <div className={s.tripDataItem}>
                <ArrowUpRightIcon size="14" />
                {totals.elevationM} m
              </div>
            )}
          </div>
        </section>

        <Divider />

        <section>
          <h2>Stages</h2>
          <StageList stages={stages} clickedStage={clickedStage} />
        </section>
      </div>
    </main>
  );
}
