import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchTripByIdWithStages } from "../../lib/trips";

export default function AdminTrip() {
  const { tripId } = useParams();
  const [trip, setTrip] = React.useState(null);
  const [stages, setStages] = React.useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTrip() {
      const allTrips = await fetchTripByIdWithStages(tripId);
      setTrip(allTrips);
      setStages(allTrips.expand["stages_via_trip"] || []);
    }
    loadTrip();
  }, [tripId]);

  if (error) return <p>{error}</p>;
  if (!trip) return <p>Loading…</p>;

  return (
    <div>
      <Link to={`/admin`}>
        <div>Return</div>
      </Link>
      <h1>{trip.name}</h1>

      {stages.map((stage) => (
        <div
          key={stage.id}
          style={{ border: "1px solid #ccc", margin: "1em 0", padding: "1em" }}
        >
          <Link to={`/admin/stages/${stage.id}`}>
            <p>Stage Name: {stage.name}</p>
            <p>Stage ID: {stage.id}</p>
          </Link>
        </div>
      ))}
    </div>
  );
}
