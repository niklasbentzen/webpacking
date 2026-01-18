import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import StageMap from "../components/StageMap";
import StageList from "../components/StageList/StageList";

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
    <>
      {stages.length > 0 && <StageMap stages={stages} />}

      <h1>{trip.name}</h1>
      {trip.description && <p>{trip.description}</p>}

      <p style={{ opacity: 0.85 }}>
        {totals.stageCount} stages • {totals.activityCount} activities
        {totals.distanceKm != null
          ? ` • ${totals.distanceKm.toFixed(1)} km`
          : ""}
        {totals.elevationM != null
          ? ` • ${Math.round(totals.elevationM)} m`
          : ""}
      </p>

      <h2>Stages</h2>
      <StageList stages={stages} />
    </>
  );
}
