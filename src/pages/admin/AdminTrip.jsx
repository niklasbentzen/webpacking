import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { fetchTripByIdWithStages, updateTrip, getTripHeroImageUrl } from "../../lib/trips";
import { createStage } from "../../lib/stages";
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
  const [description, setDescription] = useState("");
  const [heroImageFile, setHeroImageFile] = useState(null);
  const heroImageInputRef = useRef(null);

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
        setDescription(tripData.description || "");
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
      description !== (trip.description || "") ||
      heroImageFile !== null
    );
  }, [trip, name, description, heroImageFile]);

  async function handleSave() {
    if (!trip || !isDirty) return;

    setIsSaving(true);
    setSaveError("");
    setSavedMsg("");

    try {
      const data = new FormData();
      data.append("name", name);
      data.append("description", description);
      if (heroImageFile) data.append("heroImage", heroImageFile);

      const updated = await updateTrip(trip.id, data);
      setTrip((prev) => ({ ...prev, ...updated }));
      setHeroImageFile(null);
      if (heroImageInputRef.current) heroImageInputRef.current.value = "";
      setSavedMsg("Saved!");
      setTimeout(() => setSavedMsg(""), 1500);
    } catch {
      setSaveError("Save failed.");
    } finally {
      setIsSaving(false);
    }
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
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
          <label htmlFor="heroImage">Hero image</label>
          {trip.heroImage && !heroImageFile && (
            <img
              src={getTripHeroImageUrl(trip)}
              alt="Current hero"
              style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 6, marginBottom: "0.4em" }}
            />
          )}
          {heroImageFile && (
            <img
              src={URL.createObjectURL(heroImageFile)}
              alt="New hero preview"
              style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 6, marginBottom: "0.4em" }}
            />
          )}
          <input
            id="heroImage"
            type="file"
            accept="image/*"
            ref={heroImageInputRef}
            onChange={(e) => setHeroImageFile(e.target.files[0] || null)}
            disabled={isSaving}
          />
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
