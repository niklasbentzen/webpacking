import { useState } from "react";
import { gpx as gpxToGeoJSON } from "@tmcw/togeojson";
import simplify from "@turf/simplify";
import Map from "../../components/Map/Map";
import Heigtmap from "../../components/Map/Heightmap";
import { heightmapFromGeojson } from "../../lib/map";

function toGeoJSONFromGpxFile(file) {
  return file.text().then((text) => {
    const xml = new DOMParser().parseFromString(text, "text/xml");
    return gpxToGeoJSON(xml);
  });
}

function downloadJSON(data, filename = "route.geojson") {
  const blob = new Blob([JSON.stringify(data)], {
    type: "application/geo+json",
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  a.remove();
  URL.revokeObjectURL(url);
}

export default function AdminTest() {
  const [file, setFile] = useState(null);
  const [geojson, setGeojson] = useState(null);
  const [smallGeojson, setSmallGeojson] = useState(null);
  const [heightmap, setHeightmap] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setGeojson(null);

    if (!file) return setError("Please choose a GPX file.");

    try {
      setStatus("converting");
      const gj = await toGeoJSONFromGpxFile(file);

      setGeojson(gj);
      console.log(gj);

      const simplified = simplify(gj, {
        tolerance: 0.00005, // (before 0.00005)
        highQuality: false,
      });

      const cleaned = {
        ...simplified,
        features: simplified.features.map((f) => ({
          type: "Feature",
          properties: {}, // 🔥 strip
          geometry: {
            ...f.geometry,
            coordinates: f.geometry.coordinates.map(([lng, lat]) => [
              +lng.toFixed(5),
              +lat.toFixed(5),
            ]),
          },
        })),
      };
      setSmallGeojson(cleaned);

      const hm = heightmapFromGeojson(gj);
      setHeightmap(hm);

      setStatus("done");
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to parse/convert GPX.");
      setStatus("error");
    }
  }

  const items = [
    {
      id: "full-res",
      data: geojson,
      style: { color: "#111827", weight: 4, opacity: 0.8 },
    },
    {
      id: "low-res",
      data: smallGeojson,
      style: { color: "#45349f", weight: 4, opacity: 0.8 },
    },
  ];

  return (
    <div style={{ maxWidth: 700 }}>
      <h1>GPX → GeoJSON (gpxjs)</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          type="file"
          accept=".gpx,application/gpx+xml,text/xml,application/xml"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <button type="submit" disabled={!file || status === "parsing"}>
          {status === "reading"
            ? "Reading…"
            : status === "parsing"
            ? "Parsing…"
            : status === "converting"
            ? "Converting…"
            : "Convert"}
        </button>

        {error && <p style={{ margin: 0, color: "crimson" }}>{error}</p>}
      </form>

      {geojson && (
        <>
          <h3 style={{ marginTop: 16 }}>GeoJSON preview</h3>
          <button onClick={() => downloadJSON(geojson, "original.geojson")}>
            Download original
          </button>

          <button
            onClick={() => downloadJSON(smallGeojson, "simplified.geojson")}
          >
            Download simplified
          </button>
          <pre style={{ maxHeight: 320, overflow: "auto", padding: 12 }}>
            {JSON.stringify(geojson, null, 2)}
          </pre>
          <pre style={{ maxHeight: 320, overflow: "auto", padding: 12 }}>
            {JSON.stringify(smallGeojson, null, 2)}
          </pre>

          <Map geojsonItems={items} />
          <Heigtmap profile={heightmap} />
        </>
      )}
    </div>
  );
}
