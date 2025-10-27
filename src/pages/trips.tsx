import { useState, useEffect } from "react";
import supabase from "../utils/supabase";

type Trip = {
  id: string; // or number
  title: string; // change to your column name
};

function Trips() {
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    const getTrips = async () => {
      const { data, error } = await supabase.from("trips").select("*");
      console.log(data);
      if (error) {
        console.error("Failed to fetch trips:", error);
        return;
      }
      setTrips(data ?? []);
    };

    getTrips();
  }, []);

  return (
    <>
      <ul>
        {trips.map((trip) => (
          <li key={trip.id}>{trip.title}</li>
        ))}
      </ul>
    </>
  );
}

export default Trips;
