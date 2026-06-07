import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import s from "./Admin.module.css";
import ReactMarkdown from "react-markdown";
import AdminModal from "../../components/AdminModal/AdminModal";
import AdminUploadActivity from "../../components/AdminUploadActivity/AdminUploadActivity";

import {
  fetchStageByIdWithActivities,
  updateStage,
  deleteActivity,
  createStage,
} from "../../lib/stages";
import { formatDuration } from "../../lib/stageFormatters";
import { uploadStageImage, deleteStageImage } from "../../lib/stageImages";

import {
  ArrowLeftIcon,
  PlusIcon,
  ClockIcon,
  ArrowsHorizontalIcon,
  ArrowUpRightIcon,
  PersonSimpleBikeIcon,
  PersonSimpleHikeIcon,
  BoatIcon,
  PencilSimpleIcon,
  TrashIcon,
  CopyIcon,
  CheckIcon,
} from "@phosphor-icons/react";
import AdminEditActivity from "../../components/AdminEditActivity/AdminEditActivity";
import OverTypeEditor from "../../components/OverTypeEditor/OverTypeEditor";
import { fetchStatisticsForTrip } from "../../lib/statistics";
import {
  fetchActivityStatsForTrip,
  upsertActivityStat,
} from "../../lib/activityStats";
import { pb } from "../../lib/pb";
import Divider from "@/components/Divider/Divider";

const activityTypes = {
  Bike: { label: "Bike", Icon: PersonSimpleBikeIcon },
  Hike: { label: "Hike", Icon: PersonSimpleHikeIcon },
  Ferry: { label: "Ferry", Icon: BoatIcon },
};

// DB ISO -> datetime-local string
export function toLocalInputValue(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function AdminStage() {
  const { stageId } = useParams();
  const navigate = useNavigate();

  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState(null);
  const [isEditStoryOpen, setIsEditStoryOpen] = useState(false);

  const [stage, setStage] = useState(null);
  const [activities, setActivities] = useState([]);

  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [slug, setSlug] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [body, setBody] = useState("");

  const [statistics, setStatistics] = useState([]);
  const [activityStats, setActivityStats] = useState([]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadStage() {
      try {
        const stageRes = await fetchStageByIdWithActivities(stageId);
        if (!isMounted) return;

        setStage(stageRes);
        setActivities(stageRes.expand?.activities_via_stage || []);
        setName(stageRes.name || "");
        setSlug(stageRes.slug || "");
        setBody(stageRes.body || "");
        setStartDate(toLocalInputValue(stageRes.startDate));
        setEndDate(toLocalInputValue(stageRes.endDate));
        setIsPublic(stageRes.published ?? false);

        if (stageRes.trip) {
          const [stats, aStats] = await Promise.all([
            fetchStatisticsForTrip(stageRes.trip),
            fetchActivityStatsForTrip(stageRes.trip),
          ]);
          if (!isMounted) return;
          setStatistics(stats);
          setActivityStats(aStats);
        }
      } catch (err) {
        console.error(err);
        if (!isMounted) return;
        setSaveError("Failed to load stage.");
      }
    }

    loadStage();
    return () => {
      isMounted = false;
    };
  }, [stageId]);

  const anyModalOpen = isAddActivityOpen || !!activityToEdit || isEditStoryOpen;

  useEffect(() => {
    if (!anyModalOpen) return;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollBarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollBarWidth > 0)
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [anyModalOpen]);

  async function handleSave() {
    if (!stage) return;
    setIsSaving(true);
    setSaveError("");
    setSavedMsg("");
    try {
      const payload = {
        name,
        slug,
        body,
        published: isPublic,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        publicAt: endDate
          ? new Date(
              new Date(endDate).getTime() + 48 * 60 * 60 * 1000,
            ).toISOString()
          : null,
      };
      const updated = await updateStage(stage.id, payload);
      setStage((prev) => ({ ...prev, ...updated }));
      setSavedMsg("Saved.");
    } catch (err) {
      console.error(err);
      setSaveError("Could not save.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteActivity(activityId) {
    const ok = window.confirm("Delete this activity? This cannot be undone.");
    if (!ok) return;
    setIsSaving(true);
    setSaveError("");
    setSavedMsg("");
    try {
      await deleteActivity(activityId);
      setActivities((prev) => prev.filter((a) => a.id !== activityId));
      setSavedMsg("Activity deleted.");
    } catch (err) {
      console.error(err);
      setSaveError("Could not delete activity.");
    } finally {
      setIsSaving(false);
    }
  }

  function slugify(value = "") {
    return value
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function generateSlugFromName() {
    setSlug(slugify(name));
  }

  function setDatesFromActivities() {
    if (!activities?.length) return;
    const validStarts = activities
      .map((a) => a.startTime)
      .filter(Boolean)
      .map((t) => new Date(t));
    const validEnds = activities
      .map((a) => a.endTime)
      .filter(Boolean)
      .map((t) => new Date(t));
    if (!validStarts.length || !validEnds.length) return;
    setStartDate(toLocalInputValue(new Date(Math.min(...validStarts))));
    setEndDate(toLocalInputValue(new Date(Math.max(...validEnds))));
  }

  function getStatCount(activityId, statisticId) {
    const match = activityStats.find(
      (as) => as.activity === activityId && as.statistic === statisticId,
    );
    return match?.count ?? 0;
  }

  async function handleStatCountChange(activityId, statisticId, value) {
    const count = Math.max(0, parseInt(value, 10) || 0);
    try {
      await upsertActivityStat(activityId, statisticId, count);
      setActivityStats((prev) => {
        const idx = prev.findIndex(
          (as) => as.activity === activityId && as.statistic === statisticId,
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], count };
          return next;
        }
        return [
          ...prev,
          { activity: activityId, statistic: statisticId, count },
        ];
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateSiblingStage() {
    if (!stage) return;
    try {
      const newStage = await createStage({
        trip: stage.trip,
        name: "New stage",
        slug: "",
      });
      navigate(`/admin/stages/${newStage.id}`);
    } catch (err) {
      console.error(err);
    }
  }

  const isUnchanged =
    stage &&
    stage.name === name &&
    stage.body === body &&
    stage.published === isPublic &&
    stage.slug === slug &&
    toLocalInputValue(stage.startDate) === startDate &&
    toLocalInputValue(stage.endDate) === endDate;

  return (
    <div className={s.admin}>
      {/* ── Controls ── */}
      <div className={s.controls}>
        <div className={s.rowCentered}>
          <Link to={`/admin/trips/${stage?.trip}`} className={s.backArrow}>
            <ArrowLeftIcon size={16} />
          </Link>
          <div className={s.crumb}>
            <small className={s.crumbEye}>Stage</small>
            {stage?.name}
          </div>
        </div>
        <div className={s.rowCentered}>
          {savedMsg && <span className={s.statusMsg}>{savedMsg}</span>}
          {saveError && <span className={s.statusError}>{saveError}</span>}
          <button
            type="button"
            className={s.secondary}
            onClick={handleCreateSiblingStage}
            disabled={!stage || isSaving}
          >
            <PlusIcon size={14} weight="bold" /> New stage
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !stage || isUnchanged}
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* ── General ── */}
      <div className={s.section}>
        <span className={s.eyebrow}>General</span>

        <div className={s.field}>
          <label htmlFor="name" className={s.eyebrow}>
            Stage name
          </label>
          <input
            id="name"
            type="text"
            className={s.serif}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSaving || !stage}
          />
        </div>

        <div className={s.field}>
          <div className={s.fieldRow}>
            <label htmlFor="slug" className={s.eyebrow}>
              Slug
            </label>
            <button
              type="button"
              className={s.autoGenerate}
              onClick={generateSlugFromName}
              disabled={isSaving || !stage || !name.trim()}
            >
              Auto-generate
            </button>
          </div>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={isSaving || !stage}
          />
        </div>

        <label className={s.field}>
          <div className={s.row}>
            <div className={s.checkbox}>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                disabled={isSaving || !stage}
              />
              <span className={s.checkmark}>
                <CheckIcon size={14} weight="bold" />
              </span>
            </div>
            <div>
              <span className={s.checkboxTitle}>Published</span>
              <span className={s.checkboxDesc}>
                {isPublic ? "Live on website" : "Hidden from website"}
              </span>
            </div>
          </div>
        </label>
      </div>

      {/* ── Dates ── */}
      <div className={s.section}>
        <span className={s.eyebrow}>Dates</span>

        <div className={s.fieldGrid}>
          <div className={s.field}>
            <label htmlFor="startDate" className={s.eyebrow}>
              Start
            </label>
            <input
              type="datetime-local"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isSaving || !stage}
            />
          </div>
          <div className={s.field}>
            <label htmlFor="endDate" className={s.eyebrow}>
              End
            </label>
            <input
              type="datetime-local"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isSaving || !stage}
            />
          </div>
        </div>

        <button
          type="button"
          className={s.secondary}
          onClick={setDatesFromActivities}
          disabled={!activities?.length}
        >
          <ClockIcon size={14} /> Set from activity dates
        </button>
      </div>

      {/* ── Activities ── */}
      <div className={s.section}>
        <div className={s.sectionHeader}>
          <h2>
            Activities<sup>{activities?.length}</sup>
          </h2>
          <button
            type="button"
            className={s.secondary}
            onClick={() => setIsAddActivityOpen(true)}
            disabled={!stage || isSaving}
          >
            <PlusIcon size={14} weight="bold" /> Add activity
          </button>
        </div>

        {activities.map((activity) => {
          const TypeIcon = activityTypes[activity.type]?.Icon;
          return (
            <div key={activity.id} className={s.activityCard}>
              <div className={s.acTop}>
                <span className="activity-type-marker">
                  {TypeIcon && <TypeIcon size={13} />}
                </span>
                <span className={s.acStamp}>
                  {new Date(activity.startTime).toLocaleString(undefined, {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                    timeZone: "UTC",
                  })}
                </span>
                <button
                  type="button"
                  className={s.iconButton}
                  title="Edit"
                  onClick={() => setActivityToEdit(activity)}
                >
                  <PencilSimpleIcon size={16} />
                </button>
                <button
                  type="button"
                  className={s.iconButton}
                  title="Delete"
                  onClick={() => handleDeleteActivity(activity.id)}
                >
                  <TrashIcon size={16} />
                </button>
              </div>

              <Divider />

              <div className={s.statSummary}>
                <div className={s.statSummaryCol}>
                  <div className={s.eyebrow}>Type</div>
                  <b>{activity.type}</b>
                </div>
                {activity.distanceM ? (
                  <div className={s.statSummaryCol}>
                    <div className={s.eyebrow}>Distance</div>
                    <b>{(activity.distanceM / 1000).toFixed(2)} km</b>
                  </div>
                ) : null}
                {activity.elevationGainM ? (
                  <div className={s.statSummaryCol}>
                    <div className={s.eyebrow}>Elev. gain</div>
                    <b>{activity.elevationGainM.toFixed(0)} m</b>
                  </div>
                ) : null}
                {activity.startTime && activity.endTime ? (
                  <div className={s.statSummaryCol}>
                    <div className={s.eyebrow}>Duration</div>
                    <b>
                      {formatDuration(
                        new Date(activity.endTime) -
                          new Date(activity.startTime),
                      )}
                    </b>
                  </div>
                ) : null}
              </div>

              <Divider />

              {statistics.length > 0 && (
                <div className={s.activityStats}>
                  {statistics.map((stat) => {
                    const inputRef = React.createRef();
                    const adjust = (delta) => {
                      const el = inputRef.current;
                      if (!el) return;
                      const next = Math.max(
                        0,
                        (parseInt(el.value, 10) || 0) + delta,
                      );
                      el.value = next;
                      handleStatCountChange(activity.id, stat.id, next);
                    };
                    return (
                      <div key={stat.id} className={s.activityStatRow}>
                        <button
                          className={s.iconButton}
                          type="button"
                          onClick={() => adjust(-1)}
                        >
                          -
                        </button>
                        <button
                          className={s.iconButton}
                          type="button"
                          onClick={() => adjust(1)}
                        >
                          +
                        </button>
                        <input
                          ref={inputRef}
                          className={s.activityStatInput}
                          min="0"
                          defaultValue={getStatCount(activity.id, stat.id)}
                          onBlur={(e) =>
                            handleStatCountChange(
                              activity.id,
                              stat.id,
                              e.target.value,
                            )
                          }
                        />
                        <span className={s.activityStatLabel}>{stat.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Story ── */}
      <div className={s.section}>
        <div className={s.sectionHeader}>
          <h2>Story</h2>
          <button
            type="button"
            className={s.secondary}
            onClick={() => setIsEditStoryOpen(true)}
          >
            <PencilSimpleIcon size={14} /> Edit
          </button>
        </div>
        <div className={s.storyPreview}>
          <ReactMarkdown>{stage?.body || "No story yet…"}</ReactMarkdown>
        </div>
      </div>

      {/* ── Images ── */}
      <div className={s.section}>
        <span className={s.eyebrow}>Images</span>
        <div className={s.imageGrid}>
          {stage?.images?.map((filename) => {
            const isUsed = stage.body?.includes(filename);
            return (
              <div
                key={filename}
                className={`${s.imageCard} ${!isUsed ? s.imageCardUnref : ""}`}
              >
                <img
                  src={pb.files.getURL(stage, filename)}
                  alt={filename}
                  loading="lazy"
                />
                <div className={s.imageOverlay}>
                  <button
                    type="button"
                    className={s.imageOverlayBtn}
                    title="Copy markdown"
                    onClick={() => {
                      const url = pb.files.getURL(stage, filename);
                      navigator.clipboard.writeText(`![${filename}](${url})`);
                    }}
                  >
                    <CopyIcon size={14} />
                  </button>
                  <button
                    type="button"
                    className={s.imageOverlayBtn}
                    title="Delete"
                    onClick={async () => {
                      try {
                        const updated = await deleteStageImage(
                          stage.id,
                          filename,
                        );
                        setStage((prev) =>
                          prev ? { ...prev, images: updated.images } : prev,
                        );
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Modals ── */}
      <AdminModal
        open={isAddActivityOpen}
        title="Add activity"
        onClose={() => setIsAddActivityOpen(false)}
      >
        {stage && (
          <AdminUploadActivity
            stageId={stage.id}
            activities={activities}
            setActivities={setActivities}
          />
        )}
      </AdminModal>

      <AdminModal
        open={!!activityToEdit}
        title="Edit activity"
        onClose={() => setActivityToEdit(null)}
      >
        <AdminEditActivity
          activity={activityToEdit}
          setActivities={setActivities}
          tripId={stage?.trip}
        />
      </AdminModal>

      <AdminModal
        open={isEditStoryOpen}
        title="Edit story"
        onClose={() => setIsEditStoryOpen(false)}
      >
        <OverTypeEditor
          value={body}
          onChange={setBody}
          onSave={handleSave}
          onUploadImage={async (file) => {
            const { url } = await uploadStageImage(stage.id, file);
            return url;
          }}
        />
      </AdminModal>
    </div>
  );
}
