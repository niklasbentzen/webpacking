import { useEffect, useState } from "react";
import { fetchAllTripsWithStages, createTrip } from "../../lib/trips";
import { Link, useNavigate } from "react-router-dom";
import s from "./Admin.module.css";
import { ArrowRightIcon } from "@phosphor-icons/react";
import AdminModal from "../../components/AdminModal/AdminModal";

export default function AdminHome() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

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

  function openModal() {
    setNewName("");
    setCreateError("");
    setModalOpen(true);
  }

  return (
    <div className={s.admin}>
      <div className={s.section}>
        <div className={s.sectionHeader}>
          <h3>Trips</h3>
          <button type="button" className={s.secondary} onClick={openModal}>
            New trip
          </button>
        </div>

        {trips.map((trip) => {
          const stages = trip.expand?.stages_via_trip || [];
          return (
            <Link
              key={trip.id}
              to={`/admin/trips/${trip.id}`}
              className={s.tripCard}
            >
              <div>
                <p className={s.tripName}>{trip.name}</p>
                <p className={s.tripMeta}>
                  {stages.length} stage{stages.length !== 1 ? "s" : ""}
                </p>
              </div>
              <ArrowRightIcon size={16} />
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
