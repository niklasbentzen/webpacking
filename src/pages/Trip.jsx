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
import { formatDateRange } from "../lib/stages";

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

  const tripTotals = useMemo(() => summarizeTripFromStages(stages), [stages]);

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
        <h1>{trip?.name ?? status}</h1>
        {trip?.description && <p>{trip.description}</p>}
      </div>

      <div className={s.stages}>
        <section>
          <h2>Trip</h2>
          <div className={s.tripData}>
            {tripTotals.startTime && (
              <div className={s.tripDataItem}>
                <span>
                  {formatDateRange(tripTotals.startTime, tripTotals.endTime)}
                </span>
              </div>
            )}
            {tripTotals.distanceM != null && (
              <div className={s.tripDataItem}>
                <ArrowsHorizontalIcon size="14" />
                <span>{(tripTotals.distanceM / 1000).toFixed(1)} km</span>
              </div>
            )}
            {tripTotals.elevationM != null && (
              <div className={s.tripDataItem}>
                <ArrowUpRightIcon size="14" />
                {tripTotals.elevationM.toFixed(0)} m
              </div>
            )}
          </div>
        </section>

        <Divider />

        <section>
          <h2>
            Stages
            <sup className={s.sup}>{stages.length}</sup>
          </h2>
          <StageList stages={stages} clickedStage={clickedStage} />
        </section>
      </div>
    </main>
  );
}
