import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { pb } from "../lib/pb";
import TripMap from "../components/TripMap";

export default function Segment() {
  const { slug } = useParams();
  const [segment, setSegment] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const seg = await pb
          .collection("segments")
          .getFirstListItem(`slug='${slug}'`);
        setSegment(seg);
      } catch (e) {
        setError(e?.message || "Failed to load segment");
      }
    })();
  }, [slug]);

  const gpxURLs = useMemo(() => {
    if (!segment?.gpxFiles?.length) return [];
    return segment.gpxFiles.map((file) => pb.files.getURL(segment, file));
  }, [segment]);

  if (error) return <p>{error}</p>;
  if (!segment) return <p>Loading…</p>;

  return (
    <article>
      <TripMap gpxURLs={gpxURLs} />
      <h1>{segment.name}</h1>

      {(segment.distanceKm || segment.elevationM) && (
        <p>
          {segment.distanceKm ? `${segment.distanceKm} km` : ""}
          {segment.distanceKm && segment.elevationM ? " • " : ""}
          {segment.elevationM ? `${segment.elevationM} m` : ""}
        </p>
      )}

      {gpxURLs.length > 0 && (
        <>
          <h3>GPX</h3>
          <ul>
            {gpxURLs.map((u) => (
              <li key={u}>
                <a href={u} target="_blank" rel="noreferrer">
                  Download track
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      <ReactMarkdown>{segment.body || ""}</ReactMarkdown>
    </article>
  );
}
