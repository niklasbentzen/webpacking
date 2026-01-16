import { Link } from "react-router-dom";
import { pb } from "../../lib/pb";
import Sparkline from "../SparkLine/Sparkline";
import "./SegmentList.module.css";

export default function SegmentList({ segments }) {
  if (!segments?.length) return null;

  return (
    <ul style={{ listStyle: "none", padding: 0 }}>
      {segments.map((s) => {
        const gpxURLs = (s.gpxFiles || []).map((file) =>
          pb.files.getURL(s, file)
        );

        return (
          <li
            key={s.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <Sparkline gpxURLs={gpxURLs} />

            <Link to={`/segments/${s.slug}`} style={{ fontSize: 18 }}>
              {s.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
