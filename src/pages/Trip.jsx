import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { pb } from "../lib/pb";

import TripMap from "../components/TripMap";
import SegmentList from "../components/SegmentList/SegmentList";

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
          .getFirstListItem(`slug='${slug}'`);

        const segRes = await pb.collection("segments").getFullList({
          filter: `published = true && trip = '${tripRes.id}'`,
          sort: "startDate",
        });

        setTrip(tripRes);
        setSegments(segRes);
      } catch (e) {
        setError(e?.message || "Failed to load trip");
      }
    })();
  }, [slug]);

  const gpxURLs = [];
  for (const seg of segments) {
    const files = seg.gpxFiles || [];
    for (const file of files) {
      gpxURLs.push(pb.files.getURL(seg, file));
    }
  }

  if (error) return <p>{error}</p>;
  if (!trip) return <p>Loading…</p>;

  return (
    <>
      {gpxURLs.length > 0 && <TripMap gpxURLs={gpxURLs} />}
      <h1>{trip.name}</h1>

      {trip.description && <p>{trip.description}</p>}

      <h2>Segments</h2>
      <SegmentList segments={segments} />
    </>
  );
}
