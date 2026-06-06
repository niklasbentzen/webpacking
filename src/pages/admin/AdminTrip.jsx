import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { fetchTripByIdWithStages, fetchAllTripsWithStages, updateTrip, getTripHeroImageUrl, setActiveTrip } from "../../lib/trips";
import { createStage } from "../../lib/stages";
import { processPlannedRouteGpx } from "../../lib/activities";
import s from "./Admin.module.css";
import Divider from "../../components/Divider/Divider";
import AdminStageStats from "../../components/AdminStageStats/AdminStageStats";
import { ArrowLeftIcon } from "@phosphor-icons/react";

export default function AdminTrip() {
  const { tripId } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [stages, setStages] = useState([]);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
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

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const [isCreatingStage, setIsCreatingStage] = useState(false);
  const [createStageError, setCreateStageError] = useState("");

  useEffect(() => {
    async function loadTrip() {
      try {
        setError("");
        const tripData = await fetchTripByIdWithStages(tripId);
        setTrip(tripData);
        setStages(tripData.expand?.stages_via_trip || []);
        setName(tripData.name || "");
        setSlug(tripData.slug || "");
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
    return (
      name !== (trip.name || "") ||
      slug !== (trip.slug || "") ||
      description !== (trip.description || "") ||
      published !== (trip.published ?? false) ||
      active !== (trip.active ?? false) ||
      heroImageFile !== null ||
      plannedRouteBlob !== null
    );
  }, [trip, name, slug, description, published, active, heroImageFile, plannedRouteBlob]);

  async function handleSave() {
    if (!trip || !isDirty) return;

    setIsSaving(true);
    setSaveError("");
    setSavedMsg("");

    try {
      const data = new FormData();
      data.append("name", name);
      data.append("slug", slug);
      data.append("description", description);
      data.append("published", published);
      if (heroImageFile) data.append("heroImage", heroImageFile);
      if (plannedRouteBlob) data.append("plannedTrip", plannedRouteBlob, "planned.geojson");

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

  async function handlePlannedRouteChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPlannedRouteStatus("processing");
    setPlannedRouteBlob(null);
    setPlannedRouteFileName(file.name);
    try {
      const geoJsonSmall = await processPlannedRouteGpx(file);
      setPlannedRouteBlob(new Blob([JSON.stringify(geoJsonSmall)], { type: "application/geo+json" }));
      setPlannedRouteStatus("ready");
    } catch {
      setPlannedRouteStatus("Failed to parse GPX.");
    }
  }

  async function handleDeletePlannedRoute() {
    if (!trip?.plannedTrip) return;
    if (!window.confirm("Delete the planned route? This cannot be undone.")) return;
    setIsDeletingRoute(true);
    try {
      const updated = await updateTrip(trip.id, { "plannedTrip-": [trip.plannedTrip] });
      setTrip((prev) => ({ ...prev, ...updated }));
    } catch {
      // leave existing file in place on error
    } finally {
      setIsDeletingRoute(false);
    }
  }

  async function handleDeleteHeroImage() {
    if (!trip?.heroImage) return;
    if (!window.confirm("Delete the hero image? This cannot be undone.")) return;
    const updated = await updateTrip(trip.id, { "heroImage-": [trip.heroImage] });
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
      setStages((prev) => [newStage, ...prev]);
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
      <div className={s.controls}>
        <div className={s.rowCentered}>
          <Link to="/admin">
            <ArrowLeftIcon size={14} />
          </Link>
          <p>{trip?.name}</p>
        </div>

        <div className={s.rowCentered}>
          {savedMsg && <span className={s.statusMsg}>{savedMsg}</span>}
          {saveError && <span className={s.statusError}>{saveError}</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>

      <div className={s.section}>
        <div className={s.field}>
          <label htmlFor="name">Trip name</label>
          <input
            id="name"
            type="text"
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
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSaving}
          />
        </div>

        <div className={s.field}>
          <label htmlFor="published">Published</label>
          <label className={s.checkboxLabel}>
            <input
              id="published"
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              disabled={isSaving}
            />
            {published ? "Live on website" : "Hidden from website"}
          </label>
        </div>

        <div className={s.field}>
          <label htmlFor="active">On tour</label>
          <label className={s.checkboxLabel}>
            <input
              id="active"
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              disabled={isSaving}
            />
            {active ? "Currently active — redirects to this trip" : "Not active"}
          </label>
        </div>

        <div className={s.field}>
          <label>Planned route (GPX)</label>
          {trip.plannedTrip && !plannedRouteBlob && (
            <div className={s.fieldRow}>
              <p className={s.tripMeta}>{trip.plannedTrip}</p>
              <button
                type="button"
                className={s.secondary}
                onClick={handleDeletePlannedRoute}
                disabled={isDeletingRoute || isSaving}
              >
                {isDeletingRoute ? "Deleting…" : "Delete"}
              </button>
            </div>
          )}
          {(!trip.plannedTrip || plannedRouteBlob) && (
            <input
              type="file"
              accept=".gpx"
              ref={plannedRouteInputRef}
              onChange={handlePlannedRouteChange}
              disabled={isSaving}
            />
          )}
          {plannedRouteStatus === "processing" && <span>Processing…</span>}
          {plannedRouteStatus === "ready" && <span>{plannedRouteFileName} — save to upload</span>}
          {plannedRouteStatus !== "" && plannedRouteStatus !== "processing" && plannedRouteStatus !== "ready" && (
            <span className={s.statusError}>{plannedRouteStatus}</span>
          )}
        </div>

        <div className={s.field}>
          <label htmlFor="heroImage">Hero image</label>
          {trip.heroImage && !heroImageFile && (
            <>
              <img
                src={getTripHeroImageUrl(trip)}
                alt="Current hero"
                className={s.imagePreview}
              />
              <div className={s.fieldRow}>
                <span className={s.tripMeta}>{trip.heroImage}</span>
                <button
                  type="button"
                  className={s.secondary}
                  disabled={isSaving}
                  onClick={handleDeleteHeroImage}
                >
                  Delete
                </button>
              </div>
            </>
          )}
          {heroImageFile && (
            <>
              <img
                src={URL.createObjectURL(heroImageFile)}
                alt="New hero preview"
                className={s.imagePreview}
              />
              <span>{heroImageFile.name} — save to upload</span>
            </>
          )}
          {(!trip.heroImage || heroImageFile) && (
            <input
              id="heroImage"
              type="file"
              accept="image/*"
              ref={heroImageInputRef}
              onChange={(e) => setHeroImageFile(e.target.files[0] || null)}
              disabled={isSaving}
            />
          )}
        </div>
      </div>

      <Divider />

      <div className={s.section}>
        <div className={s.sectionHeader}>
          <h3>
            Stages<sup>{stages.length}</sup>
          </h3>
          <div className={s.rowCentered}>
            <button
              type="button"
              className={s.secondary}
              onClick={handleCreateStage}
              disabled={isCreatingStage}
            >
              {isCreatingStage ? "Creating…" : "New stage"}
            </button>
          </div>
        </div>

        {createStageError && <p className={s.statusError}>{createStageError}</p>}

        {stages.map((stage) => (
          <Link
            key={stage.id}
            to={`/admin/stages/${stage.id}`}
            className={s.stageCard}
          >
            <p>{stage.name}</p>
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
          </Link>
        ))}
      </div>

      <Divider />

      <div className={s.section}>
        <div className={s.sectionHeader}>
          <h3>Statistics</h3>
        </div>
        <AdminStageStats tripId={trip.id} activities={[]} showCounts={false} />
      </div>
    </div>
  );
}
