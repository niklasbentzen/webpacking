import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { pb } from "../lib/pb";

export default function Trip() {
  const { slug } = useParams();
  const [trip, setTrip] = useState(null);
  const [segments, setSegments] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const tripRes = await pb
          .collection("trips")
          .getFirstListItem(`slug="${slug}"`);

        const segRes = await pb.collection("segments").getFullList({
          filter: `published = true && trip="${tripRes.id}"`,
          sort: "order",
        });

        setTrip(tripRes);
        setSegments(segRes);
      } catch (e) {
        setError(e?.message || "Failed to load trip");
      }
    })();
  }, [slug]);

  if (error) return <p>{error}</p>;
  if (!trip) return <p>Loading…</p>;

  return (
    <>
      <h1>{trip.title}</h1>
      {trip.description && <p>{trip.description}</p>}

      <h2>Segments</h2>
      <ul>
        {segments.map((s) => (
          <li key={s.id}>
            <Link to={`/segments/${s.slug}`}>{s.title}</Link>
          </li>
        ))}
      </ul>
    </>
  );
}
