import { act, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StageList from "../components/StageList/StageList";
import Divider from "../components/Divider/Divider";

import s from "./Trip.module.css";

import {
  ArrowUpRightIcon,
  ArrowsHorizontalIcon,
  GpsFixIcon,
  LockIcon,
  LockOpenIcon,
  Log,
  PathIcon,
  SelectionIcon,
} from "@phosphor-icons/react";

import {
  fetchTripBySlug,
  fetchStagesForTripWithActivities,
  summarizeTripFromStages,
} from "../lib/trips";
import { formatDateRange } from "../lib/stages";
import Map from "../components/Map/Map";
import TripLayer from "../components/Map/TripLayer";
import PlannedRoute from "../components/Map/PlannedRoute";
import InReachLayer from "../components/Map/InReachLayer";
import React from "react";
import { pb } from "../lib/pb";
import Login from "../components/Login/Login";
import Modal from "../components/Modal/Modal";
import { useAuth } from "@/lib/hooks/useAuth";

export default function Trip() {
  const { slug } = useParams();
  const [trip, setTrip] = useState(null);
  const [stages, setStages] = useState([]);
  const [clickedStage, setClickedStage] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Idle");
  const layerRef = useRef();
  const tripLayerRef = useRef();

  const { isLoggedIn, logout } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const [hoverLogin, setHoverLogin] = useState(false);

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
        <Map>
          {isLoggedIn && <InReachLayer ref={layerRef} />}
          <TripLayer
            ref={tripLayerRef}
            stages={stages}
            clickedStage={clickedStage}
            setClickedStage={setClickedStage}
          />
          <PlannedRoute trip={trip} />
        </Map>

        <div className={s.mapControls}>
          {isLoggedIn ? (
            <button className={s.mapControl} onClick={() => logout()}>
              Log out
            </button>
          ) : (
            <button
              className={s.mapControl}
              onClick={() => setIsLoginOpen(true)}
            >
              Login
            </button>
          )}
          <button
            className={s.mapControl}
            onClick={() => layerRef.current?.locate()}
            disabled={!isLoggedIn}
            title={
              isLoggedIn
                ? "Last location from Garmin InReach"
                : "Login to see last location from Garmin InReach"
            }
          >
            <GpsFixIcon size="20" />
          </button>
          <button
            className={s.mapControl}
            onClick={() => tripLayerRef.current?.fitBounds()}
            title="See entire route"
          >
            <PathIcon size="20" />
          </button>
        </div>
      </div>
      <div className={s.info}>
        <h1>{trip?.name ?? status}</h1>
        {trip?.description && <p>{trip.description}</p>}
      </div>

      <div className={s.stages}>
        <section>
          <div className={s.tripHeader}>
            <h2>Trip</h2>
          </div>
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
      <Modal
        open={isLoginOpen}
        title="Login"
        onClose={() => setIsLoginOpen(false)}
      >
        <Login
          onSuccess={({ isAdmin }) => {
            setIsLoginOpen(false);
            navigate(isAdmin ? "/admin" : "/");
          }}
        />
      </Modal>
    </main>
  );
}
