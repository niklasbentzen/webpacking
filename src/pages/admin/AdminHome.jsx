import { useEffect, useState } from "react";
import {
  fetchAllTripsWithStages,
  createTrip,
  setActiveTrip,
} from "../../lib/trips";
import { Link, useNavigate } from "react-router-dom";
import s from "./Admin.module.css";
import { PlusIcon, CaretRightIcon } from "@phosphor-icons/react";
import AdminModal from "../../components/AdminModal/AdminModal";

export default function AdminHome() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    async function loadTrips() {
      const allTrips = await fetchAllTripsWithStages();
      setTrips(allTrips);
    }
    loadTrips();
  }, []);

  async function handleCreateTrip(e) {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsCreating(true);
    setCreateError("");

    try {
      const trip = await createTrip({ name: newName.trim(), published: true });
      navigate(`/admin/trips/${trip.id}`);
    } catch {
      setCreateError("Could not create trip.");
      setIsCreating(false);
    }
  }

  async function handleToggleActive(e, trip) {
    e.preventDefault();
    e.stopPropagation();
    if (togglingId) return;
    setTogglingId(trip.id);
    const nextActive = !trip.active;
    setTrips((prev) =>
      prev.map((t) => ({
        ...t,
        active: t.id === trip.id ? nextActive : false,
      })),
    );
    try {
      await setActiveTrip(nextActive ? trip.id : null, trips);
    } catch {
      setTrips((prev) =>
        prev.map((t) => ({
          ...t,
          active: t.id === trip.id ? trip.active : t.active,
        })),
      );
    } finally {
      setTogglingId(null);
    }
  }

  function openModal() {
    setNewName("");
    setCreateError("");
    setModalOpen(true);
  }

  return (
    <div className={s.admin}>
      <div className={s.section}>
        <span className={s.eyebrow}>Dashboard</span>
        <div className={s.sectionHeader}>
          <h2>Trips</h2>
          <button type="button" className={s.secondary} onClick={openModal}>
            <PlusIcon size={14} weight="bold" /> New trip
          </button>
        </div>

        {trips.map((trip) => {
          const stages = trip.expand?.stages_via_trip || [];
          return (
            <Link
              key={trip.id}
              to={`/admin/trips/${trip.id}`}
              className={`${s.tripCard} ${trip.active ? s.tripCardActive : ""}`}
            >
              <div className={s.tripCardMain}>
                <span className={s.tripName}>{trip.name}</span>
                <span className={s.tripMeta}>
                  {stages.length} stage{stages.length !== 1 ? "s" : ""}
                  {!trip.published ? " · hidden" : ""}
                </span>
              </div>

              <button
                type="button"
                className={`${s.tourToggle} ${trip.active ? s.tourToggleOn : s.tourToggleOff}`}
                disabled={togglingId === trip.id}
                onClick={(e) => handleToggleActive(e, trip)}
              >
                {trip.active ? "Active" : "Set active"}
              </button>

              <span className={s.chev}>
                <CaretRightIcon size={18} />
              </span>
            </Link>
          );
        })}
      </div>

      <AdminModal
        open={modalOpen}
        title="New trip"
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleCreateTrip} className={s.modal}>
          <div className={s.field}>
            <label htmlFor="newTripName">Trip name</label>
            <input
              id="newTripName"
              type="text"
              name="name"
              className={s.serif}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              disabled={isCreating}
            />
          </div>

          {createError && <span className={s.statusError}>{createError}</span>}

          <button type="submit" disabled={isCreating || !newName.trim()}>
            {isCreating ? "Creating…" : "Create trip"}
          </button>
        </form>
      </AdminModal>
    </div>
  );
}
