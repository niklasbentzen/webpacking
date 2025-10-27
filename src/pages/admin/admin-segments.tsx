import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { getSegmentsFromTripId } from "../../utils/service";
import IconButton from "../../components/ui/IconButton/IconButton";
import { Plus, ChevronLeft } from "lucide-react";

function AdminSegments() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [segments, setSegments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchSegments = async () => {
      try {
        const data = await getSegmentsFromTripId(id);
        setSegments(data || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to fetch segments");
      } finally {
        setLoading(false);
      }
    };

    fetchSegments();
  }, [id]);

  return (
    <div className="flex-col">
      <header className="table-title flex-row space-between align-center">
        <div className="flex-row gap-10">
          <IconButton
            icon={<ChevronLeft size={16} onClick={() => navigate(`/admin`)} />}
          />
          <h3>Segments</h3>
        </div>
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
          {segments.map((segment) => (
            <tr
              key={segment.id}
              onClick={() => navigate(`/admin-segment/${segment.id}`)} // route with ID
              className="cursor-pointer hover:bg-gray-100"
            >
              <td>{segment.name}</td>
              <td>{segment.public ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminSegments;
