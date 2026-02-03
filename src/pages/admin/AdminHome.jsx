import React, { useEffect, useState } from "react";
import UploadGpx from "../../components/UploadGpx/UploadGpx";
import { fetchAllTripsWithStages } from "../../lib/trips";
import { Link } from "react-router-dom";

export default function AdminHome() {
  const [trips, setTrips] = React.useState([]);

  useEffect(() => {
    async function loadTrips() {
      const allTrips = await fetchAllTripsWithStages();
      setTrips(allTrips);
    }
    loadTrips();
  }, []);

  console.log(trips);
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>
        Welcome to the admin dashboard. Here you can manage your application.
      </p>

      <section>
        <h2>Trips Overview</h2>
        {trips.map((trip) => (
          <div
            key={trip.id}
            style={{
              border: "1px solid #ccc",
              margin: "1em 0",
              padding: "1em",
            }}
          >
            <Link to={`/admin/trips/${trip.id}`}>
              <h3>{trip.name}</h3>
            </Link>
            <label>Recent stages</label>
            {trip.expand["stages_via_trip"].slice(0, 3).map((stage) => (
              <div key={stage.id}>
                <Link to={`/admin/stages/${stage.id}`}>{stage.name}</Link>
              </div>
            ))}
          </div>
        ))}
      </section>

      <section></section>
    </div>
  );
}
