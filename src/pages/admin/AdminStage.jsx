import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import s from "./Admin.module.css";
import ReactMarkdown from "react-markdown";
import AdminModal from "../../components/AdminModal/AdminModal";
import AdminUploadGpx from "../../components/AdminUploadGpx/AdminUploadGpx";

import {
  fetchStageByIdWithActivities,
  formatDuration,
  updateStage,
  deleteActivity,
  uploadStageImage,
  deleteStageImage,
} from "../../lib/stages";

import Divider from "../../components/Divider/Divider";
import {
  ArrowLeftIcon,
  ArrowsHorizontalIcon,
  ArrowUpRightIcon,
  ClockIcon,
  PersonSimpleBikeIcon,
  PersonSimpleHikeIcon,
  BoatIcon,
  TrashIcon,
  CopyIcon,
} from "@phosphor-icons/react";
import AdminEditActivity from "../../components/AdminEditActivity/AdminEditActivity";
import OverTypeEditor from "../../components/OverTypeEditor/OverTypeEditor";
import { pb } from "../../lib/pb";

const activityTypes = {
  Bike: {
    label: "Bike",
    Icon: PersonSimpleBikeIcon,
  },
  Hike: {
    label: "Hike",
    Icon: PersonSimpleHikeIcon,
  },
  Ferry: {
    label: "Ferry",
    Icon: BoatIcon,
  },
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

  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState(null);
  const [isEditStoryOpen, setIsEditStoryOpen] = useState(false);

  const [stage, setStage] = useState(null);
  const [activities, setActivities] = useState([]);

  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [slug, setSlug] = useState("");
  const [startDate, setStartDate] = useState(""); // <-- string for datetime-local
  const [endDate, setEndDate] = useState(""); // <-- string for datetime-local
  const [body, setBody] = useState("");

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
        console.log("fetched stage", stageRes);
        setActivities(stageRes.expand?.activities_via_stage || []);
        setName(stageRes.name || "");
        setSlug(stageRes.slug || "");
        setBody(stageRes.body || "");
        setStartDate(toLocalInputValue(stageRes.startDate));
        setEndDate(toLocalInputValue(stageRes.endDate));
        setIsPublic(stageRes.published ?? false);
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
        // datetime-local string -> ISO (UTC) for DB
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
      };

      console.log("saving payload", payload);
      const updated = await updateStage(stage.id, payload);
      console.log("updated stage", updated);
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
      .replace(/[\u0300-\u036f]/g, "")
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

    const earliest = new Date(Math.min(...validStarts));
    const latest = new Date(Math.max(...validEnds));

    // convert to datetime-local format (same helper you already use)
    setStartDate(toLocalInputValue(earliest));
    setEndDate(toLocalInputValue(latest));
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
      <div className={s.controls}>
        <div className={s.rowCentered}>
          <Link to={`/admin/trips/${stage?.trip}`}>
            <ArrowLeftIcon size={14} />
          </Link>
          <p>{stage?.name}</p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !stage || isUnchanged}
        >
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </div>

      <div className={s.section}>
        <div className={s.general}>
          <div className={s.field}>
            <label htmlFor="name">Stage name</label>
            <div className={s.row}>
              <input
                id="name"
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSaving || !stage}
              />
            </div>
          </div>

          <div className={(s.field, s.published)}>
            <label htmlFor="isPublic">Stage visibility</label>
            <div className={s.rowCentered}>
              <input
                id="isPublic"
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                disabled={isSaving || !stage}
              />
              <span>Public</span>
            </div>
          </div>
        </div>

        <div className={s.field}>
          <div className={s.rowCentered}>
            <label htmlFor="slug">Slug </label>
            <p
              className={s.autoGenerate}
              onClick={generateSlugFromName}
              title="Generate slug from stage name"
              style={{
                cursor:
                  isSaving || !stage || !name.trim()
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              Auto-generate
            </p>
          </div>

          <div className={s.row}>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={isSaving || !stage}
            />
          </div>
        </div>

        <div className={s.general}>
          <div className={s.field}>
            <label htmlFor="startDate">Start date & time</label>
            <input
              type="datetime-local"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isSaving || !stage}
            />
          </div>

          <div className={s.field}>
            <label htmlFor="endDate">End date & time</label>
            <input
              type="datetime-local"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isSaving || !stage}
            />
          </div>
        </div>
        <div className={s.row}>
          <button
            type="button"
            className={s.secondary}
            onClick={setDatesFromActivities}
            disabled={!activities?.length}
          >
            Set from activity dates
          </button>
        </div>
      </div>
      <Divider />

      <div className={s.section}>
        <div className={s.sectionHeader}>
          <h3>
            Activities<sup>{activities?.length}</sup>
          </h3>
          <button
            type="button"
            className={s.secondary}
            onClick={() => setIsAddActivityOpen(true)}
            disabled={!stage || isSaving}
          >
            + Add activity
          </button>
        </div>

        {activities.map((activity) => (
          <div key={activity.id} className={s.activityCard}>
            <div className={s.sectionHeader}>
              <p>
                {new Date(activity.startTime).toLocaleString(undefined, {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </p>
              <div className={s.rowCentered}>
                {" "}
                <button
                  className={s.secondary}
                  onClick={() => setActivityToEdit(activity)}
                >
                  Edit
                </button>
                <div
                  onClick={() => handleDeleteActivity(activity.id)}
                  className={s.iconButton}
                >
                  <TrashIcon size={20} style={{ marginTop: "6px" }} />
                </div>
              </div>
            </div>

            <div className={s.activityData}>
              {activity.distanceM && (
                <div className={s.activityDataItem}>
                  <ArrowsHorizontalIcon size={14} />
                  <p>{(activity.distanceM / 1000).toFixed(2)} km</p>
                </div>
              )}
              {activity.elevationGainM && (
                <div className={s.activityDataItem}>
                  <ArrowUpRightIcon size={14} />
                  <p>{activity.elevationGainM.toFixed(0)} m</p>
                </div>
              )}
              {activity.startTime && (
                <div className={s.activityDataItem}>
                  <ClockIcon size={14} />
                  <p>
                    {formatDuration(
                      new Date(activity.endTime) - new Date(activity.startTime)
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className={s.field}>
              <label>Activity type</label>

              <div className={s.type}>
                <div className={s.activityType}>
                  {(() => {
                    const Icon = activityTypes[activity.type]?.Icon;
                    return Icon ? <Icon size={14} /> : null;
                  })()}
                  {activity.type}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Divider />

      <div className={s.section}>
        <div className={s.sectionHeader}>
          <h3>Story</h3>
          <button
            type="button"
            className={s.secondary}
            onClick={() => setIsEditStoryOpen(true)}
          >
            Edit
          </button>
        </div>

        {stage && (
          <div className={s.storyPreview}>
            <ReactMarkdown>{stage?.body ?? "No story yet..."}</ReactMarkdown>
          </div>
        )}
      </div>

      <div className={s.section}>
        <div className={s.sectionHeader}>
          <h3>Stage images</h3>
        </div>

        <div className={s.imageGrid}>
          {stage?.images?.map((filename) => {
            const isUsed = stage.body?.includes(filename);

            return (
              <div key={filename} className={s.imageCard}>
                <img
                  src={pb.files.getURL(stage, filename)}
                  alt={filename}
                  className={s.stageImage}
                  style={{ opacity: isUsed ? 1 : 0.5 }}
                  loading="lazy"
                />
                <div className={s.imageControls}>
                  <div
                    className={s.imageControl}
                    onClick={async () => {
                      try {
                        const updated = await deleteStageImage(
                          stage.id,
                          filename
                        );

                        setStage((prev) =>
                          prev
                            ? { ...prev, images: updated.images } // or updated.images ?? []
                            : prev
                        );
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                  >
                    <TrashIcon size={24} />
                  </div>
                  <div
                    className={s.imageControl}
                    onClick={() => {
                      const url = pb.files.getURL(stage, filename);
                      const markdown = `![${filename}](${url})`;
                      navigator.clipboard.writeText(markdown);
                    }}
                  >
                    <CopyIcon size={24} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AdminModal
        open={isAddActivityOpen}
        title="Add activity"
        onClose={() => setIsAddActivityOpen(false)}
      >
        {stage && (
          <AdminUploadGpx
            stageId={stage.id}
            activities={activities}
            setActivities={setActivities}
          />
        )}
      </AdminModal>

      <AdminModal
        open={!!activityToEdit}
        title={"Edit activity"}
        onClose={() => setActivityToEdit(null)}
      >
        {
          <AdminEditActivity
            activity={activityToEdit}
            setActivities={setActivities}
          />
        }
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
            return url; // ✅ return the string
          }}
        />
      </AdminModal>
    </div>
  );
}
