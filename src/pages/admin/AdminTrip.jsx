import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  fetchTripByIdWithStages,
  fetchAllTripsWithStages,
  fetchStagesForTripWithActivities,
  updateTrip,
  getTripHeroImageUrl,
  setActiveTrip,
} from "../../lib/trips";
import { createStage } from "../../lib/stages";
import { processPlannedRouteGpx } from "../../lib/activities";
import s from "./Admin.module.css";
import AdminStageStats from "../../components/AdminStageStats/AdminStageStats";
import {
  ArrowLeftIcon,
  PlusIcon,
  CaretRightIcon,
  TrashIcon,
  CheckIcon,
} from "@phosphor-icons/react";

// Newest first; stages with no startDate yet (e.g. still being planned) sort to the top.
function sortStagesNewestFirst(stages) {
  return [...stages].sort((a, b) => {
    if (!a.startDate && !b.startDate) return 0;
    if (!a.startDate) return -1;
    if (!b.startDate) return 1;
    return new Date(b.startDate) - new Date(a.startDate);
  });
}

export default function AdminTrip() {
  const { tripId } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [stages, setStages] = useState([]);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [startDate, setStartDate] = useState("");
  const [description, setDescription] = useState("");
  const [published, setPublished] = useState(false);
  const [active, setActive] = useState(false);
  const [heroImageFile, setHeroImageFile] = useState(null);
  const heroImageInputRef = useRef(null);

  const [plannedRouteBlob, setPlannedRouteBlob] = useState(null);
  const [plannedRouteStatus, setPlannedRouteStatus] = useState("");
  const [plannedRouteFileName, setPlannedRouteFileName] = useState("");
  const [isDeletingRoute, setIsDeletingRoute] = useState(false);
  const plannedRouteInputRef = useRef(null);

  const [isAutoDetectingDate, setIsAutoDetectingDate] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const [isCreatingStage, setIsCreatingStage] = useState(false);
  const [createStageError, setCreateStageError] = useState("");
  const [stagesExpanded, setStagesExpanded] = useState(false);

  useEffect(() => {
    async function loadTrip() {
      try {
        setError("");
        const tripData = await fetchTripByIdWithStages(tripId);
        setTrip(tripData);
        setStages(sortStagesNewestFirst(tripData.expand?.stages_via_trip || []));
        setName(tripData.name || "");
        setSlug(tripData.slug || "");
        setStartDate(tripData.startDate ? tripData.startDate.slice(0, 10) : "");
        setDescription(tripData.description || "");
        setPublished(tripData.published ?? false);
        setActive(tripData.active ?? false);
      } catch {
        setError("Failed to load trip.");
      }
    }
    loadTrip();
  }, [tripId]);

  const isDirty = useMemo(() => {
    if (!trip) return false;
    const savedStartDate = trip.startDate ? trip.startDate.slice(0, 10) : "";
    return (
      name !== (trip.name || "") ||
      slug !== (trip.slug || "") ||
      startDate !== savedStartDate ||
      description !== (trip.description || "") ||
      published !== (trip.published ?? false) ||
      active !== (trip.active ?? false) ||
      heroImageFile !== null ||
      plannedRouteBlob !== null
    );
  }, [
    trip,
    name,
    slug,
    startDate,
    description,
    published,
    active,
    heroImageFile,
    plannedRouteBlob,
  ]);

  async function handleSave() {
    if (!trip || !isDirty) return;

    setIsSaving(true);
    setSaveError("");
    setSavedMsg("");

    try {
      const data = new FormData();
      data.append("name", name);
      data.append("slug", slug);
      data.append("startDate", startDate);
      data.append("description", description);
      data.append("published", published);
      if (heroImageFile) data.append("heroImage", heroImageFile);
      if (plannedRouteBlob)
        data.append("plannedTrip", plannedRouteBlob, "planned.geojson");

      const updated = await updateTrip(trip.id, data);

      if (active !== (trip.active ?? false)) {
        if (active) {
          const allTrips = await fetchAllTripsWithStages();
          await setActiveTrip(trip.id, allTrips);
        } else {
          await updateTrip(trip.id, { active: false });
        }
      }
      setTrip((prev) => ({ ...prev, ...updated }));
      setHeroImageFile(null);
      if (heroImageInputRef.current) heroImageInputRef.current.value = "";
      setPlannedRouteBlob(null);
      setPlannedRouteStatus("");
      if (plannedRouteInputRef.current) plannedRouteInputRef.current.value = "";
      setSavedMsg("Saved!");
      setTimeout(() => setSavedMsg(""), 1500);
    } catch {
      setSaveError("Save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAutoDetectStartDate() {
    setIsAutoDetectingDate(true);
    try {
      const stagesWithActivities = await fetchStagesForTripWithActivities(tripId);
      let earliest = null;
      for (const stage of stagesWithActivities) {
        for (const activity of stage.expand?.activities_via_stage || []) {
          if (!activity.startTime) continue;
          const t = new Date(activity.startTime).getTime();
          if (earliest === null || t < earliest) earliest = t;
        }
      }
      if (earliest !== null) {
        setStartDate(new Date(earliest).toISOString().slice(0, 10));
      }
    } finally {
      setIsAutoDetectingDate(false);
    }
  }

  async function handlePlannedRouteChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPlannedRouteStatus("processing");
    setPlannedRouteBlob(null);
    setPlannedRouteFileName(file.name);
    try {
      const geoJsonSmall = await processPlannedRouteGpx(file);
      setPlannedRouteBlob(
        new Blob([JSON.stringify(geoJsonSmall)], {
          type: "application/geo+json",
        }),
      );
      setPlannedRouteStatus("ready");
    } catch {
      setPlannedRouteStatus("Failed to parse GPX.");
    }
  }

  async function handleDeletePlannedRoute() {
    if (!trip?.plannedTrip) return;
    if (!window.confirm("Delete the planned route? This cannot be undone."))
      return;
    setIsDeletingRoute(true);
    try {
      const updated = await updateTrip(trip.id, {
        "plannedTrip-": [trip.plannedTrip],
      });
      setTrip((prev) => ({ ...prev, ...updated }));
    } catch {
      // leave existing file in place on error
    } finally {
      setIsDeletingRoute(false);
    }
  }

  async function handleDeleteHeroImage() {
    if (!trip?.heroImage) return;
    if (!window.confirm("Delete the hero image? This cannot be undone."))
      return;
    const updated = await updateTrip(trip.id, {
      "heroImage-": [trip.heroImage],
    });
    setTrip((prev) => ({ ...prev, ...updated }));
  }

  async function handleCreateStage() {
    if (!trip) return;
    setIsCreatingStage(true);
    setCreateStageError("");
    try {
      const newStage = await createStage({
        trip: trip.id,
        name: "New stage",
        description: "",
        slug: "",
      });
      setStages((prev) => sortStagesNewestFirst([newStage, ...prev]));
      navigate(`/admin/stages/${newStage.id}`);
    } catch {
      setCreateStageError("Could not create stage.");
    } finally {
      setIsCreatingStage(false);
    }
  }

  if (error) return <p>{error}</p>;
  if (!trip) return <p>Loading…</p>;

  return (
    <div className={s.admin}>
      {/* ── Controls ── */}
      <div className={s.controls}>
        <div className={s.rowCentered}>
          <Link to="/admin" className={s.backArrow}>
            <ArrowLeftIcon size={16} />
          </Link>
          <div className={s.crumb}>
            <small className={s.crumbEye}>Trip</small>
            {trip.name}
          </div>
        </div>
        <div className={s.rowCentered}>
          {savedMsg && <span className={s.statusMsg}>{savedMsg}</span>}
          {saveError && <span className={s.statusError}>{saveError}</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {/* ── Metadata ── */}
      <div className={s.section}>
        <span className={s.eyebrow}>Metadata</span>

        <div className={s.field}>
          <label htmlFor="name">Trip name</label>
          <input
            id="name"
            type="text"
            className={s.serif}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSaving}
          />
        </div>

        <div className={s.field}>
          <label htmlFor="slug">Slug</label>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={isSaving}
          />
        </div>

        <div className={s.field}>
          <label htmlFor="startDate">Start date</label>
          <div className={s.row}>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isSaving}
            />
            <button
              type="button"
              className={s.secondary}
              onClick={handleAutoDetectStartDate}
              disabled={isSaving || isAutoDetectingDate}
            >
              {isAutoDetectingDate ? "Detecting…" : "Auto"}
            </button>
          </div>
        </div>

        <div className={s.field}>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSaving}
          />
        </div>

        <label className={s.field}>
          <div className={s.row}>
            <div className={s.checkbox}>
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                disabled={isSaving}
              />
              <span className={s.checkmark}>
                <CheckIcon size={14} weight="bold" />
              </span>
            </div>
            <div>
              <span className={s.checkboxTitle}>Published</span>
              <span className={s.checkboxDesc}>
                {published ? "Live on website" : "Hidden from website"}
              </span>
            </div>
          </div>
        </label>

        <label className={s.field}>
          <div className={s.row}>
            <div className={s.checkbox}>
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                disabled={isSaving}
              />
              <span className={s.checkmark}>
                <CheckIcon size={14} weight="bold" />
              </span>
            </div>
            <div>
              <span className={s.checkboxTitle}>On tour</span>
              <span className={s.checkboxDesc}>
                {active
                  ? "Currently active — redirects to this trip"
                  : "Not the active trip"}
              </span>
            </div>
          </div>
        </label>
      </div>

      {/* ── Statistics ── */}
      <div className={s.section}>
        <span className={s.eyebrow}>Statistics</span>
        <AdminStageStats tripId={trip.id} activities={[]} showCounts={false} />
      </div>

      {/* ── Stages ── */}
      <div className={s.section}>
        <div className={s.sectionHeader}>
          <h2>
            Stages<sup>{stages.length}</sup>
          </h2>
          <button
            type="button"
            className={s.secondary}
            onClick={handleCreateStage}
            disabled={isCreatingStage}
          >
            <PlusIcon size={14} weight="bold" />
            {isCreatingStage ? "Creating…" : "New stage"}
          </button>
        </div>

        {createStageError && (
          <p className={s.statusError}>{createStageError}</p>
        )}

        {(stagesExpanded ? stages : stages.slice(0, 3)).map((stage) => (
          <Link
            key={stage.id}
            to={`/admin/stages/${stage.id}`}
            className={s.stageCard}
          >
            <div className={s.stageCardMain}>
              {stage.startDate && (
                <span className={s.stageCardDate}>
                  {new Date(stage.startDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </span>
              )}
              <span className={s.stageCardName}>{stage.name}</span>
            </div>
            <span className={s.chev}>
              <CaretRightIcon size={18} />
            </span>
          </Link>
        ))}

        {stages.length > 3 && (
          <button
            type="button"
            className={s.secondary}
            onClick={() => setStagesExpanded((v) => !v)}
          >
            {stagesExpanded ? "Show less" : `Show all ${stages.length} stages`}
          </button>
        )}
      </div>

      {/* ── Planned route ── */}
      <div className={s.section}>
        <span className={s.eyebrow}>Planned route · GPX</span>

        {/* Saved file */}
        {trip.plannedTrip && !plannedRouteBlob && (
          <div className={s.fileChip}>
            <span className={s.fileChipName}>{trip.plannedTrip}</span>
            <button
              type="button"
              className={s.secondary}
              onClick={handleDeletePlannedRoute}
              disabled={isDeletingRoute || isSaving}
            >
              <TrashIcon size={14} />
              {isDeletingRoute ? "Deleting…" : "Delete"}
            </button>
          </div>
        )}

        {/* Pending upload */}
        {plannedRouteStatus === "ready" && (
          <div className={s.fileChip}>
            <span className={s.fileChipName}>
              {plannedRouteFileName} — save to upload
            </span>
          </div>
        )}

        {/* File picker */}
        {(!trip.plannedTrip || plannedRouteBlob !== null) &&
          plannedRouteStatus !== "ready" && (
            <label className={s.dropzone}>
              <input
                type="file"
                accept=".gpx"
                ref={plannedRouteInputRef}
                onChange={handlePlannedRouteChange}
                disabled={isSaving}
              />
              {plannedRouteStatus === "processing"
                ? "Processing…"
                : "Choose a .gpx file"}
            </label>
          )}

        {plannedRouteStatus !== "" &&
          plannedRouteStatus !== "processing" &&
          plannedRouteStatus !== "ready" && (
            <span className={s.statusError}>{plannedRouteStatus}</span>
          )}
      </div>

      {/* ── Hero image ── */}
      <div className={s.section}>
        <span className={s.eyebrow}>Hero image</span>

        {/* Saved image */}
        {trip.heroImage && !heroImageFile && (
          <>
            <img
              src={getTripHeroImageUrl(trip)}
              alt="Current hero"
              className={s.imagePreview}
            />
            <div className={s.fileChip}>
              <span className={s.fileChipName}>{trip.heroImage}</span>
              <button
                type="button"
                className={s.secondary}
                onClick={handleDeleteHeroImage}
                disabled={isSaving}
              >
                <TrashIcon size={14} />
                Delete
              </button>
            </div>
          </>
        )}

        {/* Pending upload */}
        {heroImageFile && (
          <>
            <img
              src={URL.createObjectURL(heroImageFile)}
              alt="New hero preview"
              className={s.imagePreview}
            />
            <div className={s.fileChip}>
              <span className={s.fileChipName}>
                {heroImageFile.name} — save to upload
              </span>
            </div>
          </>
        )}

        {/* File picker */}
        {!trip.heroImage && !heroImageFile && (
          <label className={s.dropzone}>
            <input
              id="heroImage"
              type="file"
              accept="image/*"
              ref={heroImageInputRef}
              onChange={(e) => setHeroImageFile(e.target.files[0] || null)}
              disabled={isSaving}
            />
            Choose a hero image
          </label>
        )}
      </div>
    </div>
  );
}
