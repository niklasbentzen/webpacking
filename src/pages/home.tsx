import { useState, useEffect } from "react";
import supabase from "../utils/supabase";
import MapView from "../components/MapView";

type Trip = {
  id: string;
  title: string;
  public: boolean;
  created_at: string;
};

function Home() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch most recent public trip
  useEffect(() => {
    const getTrips = async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("public", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error("Failed to fetch trip:", error);
        setLoading(false);
        return;
      }

      setTrip(data);
      setLoading(false);
    };

    getTrips();
  }, []);

  // Fetch activities for that trip
  useEffect(() => {
    if (!trip) return;

    const getActivities = async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("trip_id", trip.id);

      if (error) {
        console.error("Error fetching activities:", error);
      } else {
        setActivities(data ?? []);
      }
    };

    getActivities();
  }, [trip]);

  // UI Rendering
  if (loading) return <p>Loading trip...</p>;
  if (!trip) return <p>No public trips found 😢</p>;

  return (
    <main>
      <div className="map">
        <MapView tripId={trip.id} />
      </div>
      <div className="content">
        <div className="header">
          <h1 className="title">{trip.title}</h1>
        </div>

        {activities.length > 0 ? (
          <ul>
            {activities.map((act) => (
              <li key={act.id}>{act.name}</li>
            ))}
          </ul>
        ) : (
          <p>No activities found for this trip.</p>
        )}
      </div>
    </main>
  );
}

export default Home;
