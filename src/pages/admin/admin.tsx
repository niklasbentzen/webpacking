import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllTrips, createTrip } from "../../utils/service";
import IconButton from "../../components/ui/IconButton/IconButton";
import { Plus } from "lucide-react";

function Admin() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tripTitle, setNewTripTitle] = useState("");

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const data = await getAllTrips();
        setTrips(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, []);

  const handleCreateTrip = async () => {
    if (!tripTitle.trim()) return;

    try {
      const data = await createTrip(tripTitle);
    } catch (err: any) {
      setError(`Failed to create trip: ${err.message}`);
    } finally {
      setLoading(false);
    }

    setNewTripTitle("");
    const data = await getAllTrips();
    setTrips(data);
  };

  return (
    <div className="flex-col">
      <header className="table-title flex-row space-between align-center">
        <h3>Trips</h3>
        <IconButton icon={<Plus size={16} />} onClick={handleCreateTrip} />
      </header>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Public</th>
          </tr>
        </thead>
        <tbody>
          {trips.map((trip) => (
            <tr
              key={trip.id}
              onClick={() => navigate(`/admin-activities/${trip.id}`)} // route with ID
              className="cursor-pointer hover:bg-gray-100"
            >
              <td>{trip.title}</td>
              <td>{trip.public ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Admin;
