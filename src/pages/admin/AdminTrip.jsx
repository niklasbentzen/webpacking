import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { fetchTripByIdWithStages, updateTrip } from "../../lib/trips";
import { createStage } from "../../lib/stages"; // <-- add this
import s from "./Admin.module.css";
import Divider from "../../components/Divider/Divider";
import { ArrowLeftIcon } from "@phosphor-icons/react";

export default function AdminTrip() {
  const { tripId } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [stages, setStages] = useState([]);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

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
      } catch (err) {
        setError("Failed to load trip.");
      }
    }
    loadTrip();
  }, [tripId]);

  const isDirty = useMemo(() => {
    if (!trip) return false;
    return (
      name !== (trip.name || "") || description !== (trip.description || "")
    );
  }, [trip, name, description]);

  async function handleSave() {
    if (!trip || !isDirty) return;

    setIsSaving(true);
    setSaveError("");
    setSavedMsg("");

    try {
      const updated = await updateTrip(trip.id, { name, description });

      setTrip((prev) => ({
        ...prev,
        ...updated,
        name: updated?.name ?? name,
        description: updated?.description ?? description,
      }));

      setSavedMsg("Saved!");
      setTimeout(() => setSavedMsg(""), 1500);
    } catch (err) {
      setSaveError("Save failed. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateStage() {
    if (!trip) return;

    setIsCreatingStage(true);
    setCreateStageError("");

    try {
      // you can decide defaults however you want
      const newStage = await createStage({
        trip: trip.id,
        name: "New stage",
        description: "",
        slug: "",
      });

      // update list immediately
      setStages((prev) => [newStage, ...prev]);

      // go to stage edit page
      navigate(`/admin/stages/${newStage.id}`);
    } catch (err) {
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
          <Link to={`/admin`}>
            <ArrowLeftIcon size={14} />
          </Link>
          <p>{trip?.name}</p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !isDirty}
        >
          {isSaving ? "Saving..." : "Save changes"}
        </button>
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
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSaving}
          />
        </div>
      </div>

      <Divider />

      <div className={s.section}>
        <div className={s.stagesHeader}>
          <h2>
            Stages<sup>{stages.length}</sup>
          </h2>
          <div>
            <button onClick={handleCreateStage} disabled={isCreatingStage}>
              {isCreatingStage ? "Creating…" : "Create new"}
            </button>
            {createStageError && (
              <span style={{ marginLeft: 8 }}>{createStageError}</span>
            )}
          </div>
        </div>

        <ul>
          {stages.map((stage) => (
            <li key={stage.id}>
              <Link to={`/admin/stages/${stage.id}`}>
                <p>{stage.name}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
