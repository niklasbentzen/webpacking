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
  onHoverPoint,
  onHoverEnd,
}) {
  const [activities, setActivities] = useState([]);
  const [profilesById, setProfilesById] = useState({}); // { [activityId]: profileArray }
  const [statusById, setStatusById] = useState({}); // { [activityId]: "idle"|"loading"|"done"|"error" }

  useEffect(() => {
    setActivities(stage?.expand?.activities_via_stage ?? []);
  }, [stage]);

  // load the selected profile
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

  if (!selectedActivity) return <></>;
  /*
  if (status === "loading") return <div>Loading height profile…</div>;
  if (status === "error") return <div>Could not load height profile.</div>;
  if (!data.length) return <div>No height data.</div>;
*/
  const minE = Math.min(...data.map((x) => x.ele));
  const maxE = Math.max(...data.map((x) => x.ele));
  const pad = Math.max(5, Math.round((maxE - minE) * 0.08));

  return (
    <div
      style={{
        margin: "1em",
        padding: "1em",
        boxSizing: "border-box",
        background: "var(--bg)",
        borderRadius: 10,
      }}
    >
      <ResponsiveContainer width="100%" height={140} minHeight={10}>
        <AreaChart
          data={data}
          onMouseMove={(state) => {
            if (!state?.isTooltipActive) return;

            const idx = Number(state.activeTooltipIndex);

            const p = data[idx];
            if (!p || p.lat == null || p.lng == null) return;

            // call the imperative bridge with lat/lng (and anything else you want)
            onHoverPoint?.({
              lat: p.lat,
              lng: p.lng,
              distM: p.distM,
              ele: p.ele,
              i: p.i,
              activityId: selectedActivity,
            });
          }}
          onMouseLeave={() => onHoverEnd?.()}
        >
          <XAxis
            dataKey="distM"
            tickFormatter={(v) => `${formatKm(v)} km`}
            tickCount={5}
            minTickGap={30}
            height={12}
            tick={{ fontSize: 12, fill: "var(--text)" }}
          />
          <YAxis
            dataKey="ele"
            domain={["auto", "auto"]}
            tickCount={10}
            tickFormatter={(v) => `${Math.round(v)} m`}
            width={45}
            tick={{ fontSize: 12, fill: "var(--text)" }}
          />
          <Tooltip content={<ElevationTooltip />} />
          <Area
            type="monotone"
            dataKey="ele"
            strokeWidth={1}
            stroke="var(--p)"
            fill="var(--p)"
            fillOpacity={0.15}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
