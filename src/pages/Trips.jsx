import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAllTrips } from "../lib/trips";

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchAllTrips();
        setTrips(res);
      } catch (e) {
        setError(e?.message || "Failed to load trips");
      }
    })();
  }, []);

  if (error) return <p>{error}</p>;

  return (
    <>
      <h1>Trips</h1>
      <ul>
        {trips.map((t) => (
          <li key={t.id}>
            <Link to={`/trips/${t.slug}`}>{t.name}</Link>
          </li>
        ))}
      </ul>
    </>
  );
}
