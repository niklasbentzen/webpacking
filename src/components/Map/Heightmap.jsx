import React, { useEffect, useMemo, useState } from "react";
import { pb } from "../../lib/pb";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

function formatKm(meters) {
  return (meters / 1000).toFixed(1);
}

function ElevationTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const ele = payload[0].value;

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.75)",
        color: "white",
        padding: 10,
        borderRadius: 10,
        fontSize: 12,
      }}
    >
      <div>{formatKm(label)} km</div>
      <div>{Math.round(ele)} m</div>
    </div>
  );
}

export default function Heightmap({
  stage,
  selectedActivity,
  setSelectedActivity,
}) {
  const [activities, setActivities] = useState([]);
  const [profilesById, setProfilesById] = useState({}); // { [activityId]: profileArray }
  const [statusById, setStatusById] = useState({}); // { [activityId]: "idle"|"loading"|"done"|"error" }

  useEffect(() => {
    setActivities(stage?.expand?.activities_via_stage ?? []);
  }, [stage]);

  // pick a default activity if none selected
  useEffect(() => {
    if (!selectedActivity && activities.length) {
      setSelectedActivity?.(activities[0].id);
    }
  }, [activities, selectedActivity, setSelectedActivity]);

  // load ONLY the selected profile (simplest)
  useEffect(() => {
    if (!selectedActivity) return;

    const activity = activities.find((a) => a.id === selectedActivity);
    if (!activity) return;

    // already loaded
    if (profilesById[selectedActivity]) return;

    const file = activity.profile;
    if (!file) return;

    const url = pb.files.getURL(activity, file);
    if (!url) return;

    let cancelled = false;

    (async () => {
      try {
        setStatusById((s) => ({ ...s, [selectedActivity]: "loading" }));

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Profile fetch failed (${res.status})`);

        const profile = await res.json();
        if (cancelled) return;

        setProfilesById((m) => ({ ...m, [selectedActivity]: profile }));
        setStatusById((s) => ({ ...s, [selectedActivity]: "done" }));
      } catch (err) {
        console.error("Failed to load profile", selectedActivity, err);
        if (cancelled) return;
        setStatusById((s) => ({ ...s, [selectedActivity]: "error" }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activities, selectedActivity, profilesById]);

  const profile = profilesById[selectedActivity] || null;
  const status = statusById[selectedActivity] || "idle";

  // convert to recharts format (use distM + ele from your file)
  console.log(profile);
  const data = useMemo(() => {
    if (!profile) return [];
    return profile.map((p) => ({
      i: p.i,
      distM: p.distM,
      ele: p.ele,
      lat: p.lat,
      lng: p.lng,
      time: p.time,
    }));
  }, [profile]);

  if (!stage) return null;

  if (!selectedActivity) return <div>Select an activity</div>;

  if (status === "loading") return <div>Loading height profile…</div>;
  if (status === "error") return <div>Could not load height profile.</div>;
  if (!data.length) return <div>No height data.</div>;

  const minE = Math.min(...data.map((x) => x.ele));
  const maxE = Math.max(...data.map((x) => x.ele));
  const pad = Math.max(5, Math.round((maxE - minE) * 0.08));

  return (
    <div style={{ width: "100%", height: 180 }}>
      <div
        style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}
      >
        {activities.map((a) => (
          <button
            key={a.id}
            onClick={() => setSelectedActivity?.(a.id)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid rgba(0,0,0,0.15)",
              background:
                a.id === selectedActivity ? "rgba(0,0,0,0.07)" : "white",
              cursor: "pointer",
            }}
          >
            {a.type || "Activity"} ({a.id.slice(0, 4)})
          </button>
        ))}
      </div>

      <ResponsiveContainer>
        <AreaChart data={data}>
          <XAxis
            dataKey="distM"
            tickFormatter={(v) => formatKm(v)}
            minTickGap={30}
          />
          <YAxis
            dataKey="ele"
            domain={[minE - pad, maxE + pad]}
            tickFormatter={(v) => Math.round(v)}
            width={40}
          />
          <Tooltip content={<ElevationTooltip />} />
          <Area
            type="monotone"
            dataKey="ele"
            strokeWidth={2}
            fillOpacity={0.15}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
