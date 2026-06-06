import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchAllTripsWithAll,
  fetchActiveTrip,
  getTripHeroImageUrl,
  summarizeTripFromStages,
} from "../lib/trips";
import styles from "./Trips.module.css";

function formatDateRange(startTime, endTime) {
  if (!startTime) return null;
  const fmt = (d) =>
    new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(d);
  if (!endTime) return fmt(startTime);
  const start = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(startTime);
  return `${start} → ${fmt(endTime)}`;
}

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const active = await fetchActiveTrip();
        if (active) { navigate(`/trips/${active.slug}`, { replace: true }); return; }
        const res = await fetchAllTripsWithAll();
        setTrips(res);
      } catch (e) {
        setError(e?.message || "Failed to load trips");
      }
    })();
  }, []);

  if (error) return <p>{error}</p>;

  return (
    <div className={styles.page}>
      {trips.map((trip) => {
        const stages = trip.expand?.stages_via_trip || [];
        const { distanceM, elevationM, startTime, endTime, stageCount } =
          summarizeTripFromStages(stages);
        const heroUrl = getTripHeroImageUrl(trip);
        const dateRange = formatDateRange(startTime, endTime);
        const distanceKm = distanceM ? (distanceM / 1000).toFixed(1) : null;
        const elevation = elevationM ? Math.round(elevationM) : null;

        return (
          <Link key={trip.id} to={`/trips/${trip.slug}`} className={styles.card}>
            {heroUrl && (
              <img src={heroUrl} alt={trip.name} className={styles.heroImage} />
            )}
            <div className={styles.overlay}>
              <h2 className={styles.name}>{trip.name}</h2>
              <div className={styles.meta}>
                {dateRange && <span>{dateRange}</span>}
                {distanceKm && <span>↔ {distanceKm} km</span>}
                {elevation && <span>↗ {elevation} m</span>}
                {stageCount > 0 && <span>{stageCount} stages</span>}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
