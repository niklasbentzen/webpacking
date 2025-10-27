import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { getActivitiesFromTripId } from "../../utils/service";
import IconButton from "../../components/ui/IconButton/IconButton";
import { Plus } from "lucide-react";

function AdminActivity() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchActivities = async () => {
      try {
        const data = await getActivitiesFromTripId(id);
        setActivities(data || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to fetch activities");
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [id]);

  return (
    <div className="flex-col">
      <header className="table-title flex-row space-between align-center">
        <h3>Trips</h3>
        <IconButton icon={<Plus size={16} />} />
      </header>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Public</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => (
            <tr
              key={activity.id}
              onClick={() => navigate(`/admin-activity/${activity.id}`)} // route with ID
              className="cursor-pointer hover:bg-gray-100"
            >
              <td>{activity.name}</td>
              <td>{activity.public ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminActivity;
