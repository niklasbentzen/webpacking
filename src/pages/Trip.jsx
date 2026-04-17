import { useEffect, useMemo, useRef, useState } from "react";
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
  fetchTripBySlugWithAll,
  summarizeTripFromStages,
} from "../lib/trips";
import { formatDateRange } from "../lib/stageFormatters";
import Map from "../components/Map/Map";
import TripLayer from "../components/Map/TripLayer";
import PlannedRoute from "../components/Map/PlannedRoute";
import InReachLayer from "../components/Map/InReachLayer";
import React from "react";
import { pb } from "../lib/pb";
import Login from "../components/Login/Login";
import Modal from "../components/Modal/Modal";
import { useAuth } from "@/lib/hooks/useAuth";
import StageActivityPanel from "@/components/StageActivityPanel/StageActivityPanel";

export default function Trip() {
  const { slug } = useParams();
  const [trip, setTrip] = useState(null);
  const [stages, setStages] = useState([]);
  const [clickedStage, setClickedStage] = useState(null);
  const [hoveredStage, setHoveredStage] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Idle");
  const layerRef = useRef();
  const tripLayerRef = useRef();
  const mapRef = useRef();

  const { isLoggedIn, logout } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  useEffect(() => {
    setStatus("Loading...");
    (async () => {
      try {
        const tripRes = await fetchTripBySlugWithAll(slug);
        const stages = (tripRes.expand?.stages_via_trip ?? [])
          .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        setTrip(tripRes);
        setStages(stages);
      } catch (e) {
        console.error(e, e?.data);
        setError(e?.message || "Failed to load trip");
        setStatus(e?.message || "Error");
      }
    })();
  }, [slug]);

  useEffect(() => {
    if (!clickedStage) { setSelectedActivity(null); return; }
    const stage = stages.find((s) => s.id === clickedStage);
    const first = stage?.expand?.activities_via_stage?.[0];
    setSelectedActivity(first?.id ?? null);
  }, [clickedStage, stages]);

  const selectedStage = stages.find((s) => s.id === clickedStage) ?? null;
  const tripTotals = useMemo(() => summarizeTripFromStages(stages), [stages]);

  return (
    <main className={s.trip}>
      {isLoggedIn ? (
        <button className="button-secondary" onClick={() => logout()}>
          Log out
        </button>
      ) : (
        <button
          className="button-secondary"
          onClick={() => setIsLoginOpen(true)}
        >
          Login
        </button>
      )}
      <div className={s.map}>
        <Map ref={mapRef}>
          <PlannedRoute trip={trip} />
          {isLoggedIn && <InReachLayer ref={layerRef} />}
          <TripLayer
            ref={tripLayerRef}
            stages={stages}
            clickedStage={clickedStage}
            setClickedStage={setClickedStage}
            hoveredStage={hoveredStage}
            setHoveredStage={setHoveredStage}
            selectedActivity={selectedActivity}
            setSelectedActivity={setSelectedActivity}
          />
        </Map>

        <div className={`${s.mapControls} ${s.topLeft}`}>
          <button
            className="button-secondary button-icon"
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
            className="button-secondary button-icon"
            onClick={() => tripLayerRef.current?.fitBounds()}
            title="See entire route"
          >
            <PathIcon size="20" />
          </button>
        </div>

        {selectedStage && (
          <div className={`${s.mapControls} ${s.bottomLeft}`}>
            <StageActivityPanel
              stage={selectedStage}
              mapRef={mapRef}
              selectedActivity={selectedActivity}
              setSelectedActivity={setSelectedActivity}
            />
          </div>
        )}
      </div>

      <div className={s.stages}>
        <section>
          <div className={s.tripHeader}>
            <h2>{trip?.name ?? status}</h2>
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
          {trip?.description && <p>{trip.description}</p>}
        </section>

        <Divider />

        <section style={{ flex: "1 1 0%" }}>
          <h2>
            Stages
            <sup className={s.sup}>{stages.length}</sup>
          </h2>
          <StageList
            stages={stages}
            clickedStage={clickedStage}
            setClickedStage={setClickedStage}
            hoveredStage={hoveredStage}
            setHoveredStage={setHoveredStage}
          />
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
