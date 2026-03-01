import React, { useEffect, useState } from "react";
import { fetchAllTripsWithStages } from "../../lib/trips";
import { Link } from "react-router-dom";
import s from "./Admin.module.css";

export default function AdminHome() {
  const [trips, setTrips] = React.useState([]);

  useEffect(() => {
    async function loadTrips() {
      const allTrips = await fetchAllTripsWithStages();
      setTrips(allTrips);
    }
    loadTrips();
  }, []);

  return (
    <div className={s.admin}>
      <h2>Trips Overview</h2>
      {trips.map((trip) => (
        <div key={trip.id}>
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
    </div>
  );
}
