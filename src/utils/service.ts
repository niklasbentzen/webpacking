import supabase from "./supabase";
import { useEffect, useState } from "react";

/**
 * Fetches all trips with their associated segments
 */
export async function getAllTripsWithSegments() {
  const { data, error } = await supabase
    .from("trips")
    .select(
      `
      id,
      title,
      public,
      created_at,
      segments (*)
    `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Fetches the most recent public trip and its segments
 */
export async function getLatestPublicTripWithSegments() {
  const { data, error } = await supabase
    .from("trips")
    .select(
      `
      id,
      title,
      public,
      created_at,
      segments (*)
    `
    )
    .eq("public", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetches segments from a specific Trip ID
 */
export async function getSegmentsFromTripId(tripId: string) {
  const { data, error } = await supabase
    .from("segments")
    .select("*")
    .eq("trip_id", tripId);

  if (error) throw error;
  return data;
}

/**
 * Fetches all trips
 */
export async function getAllTrips() {
  const { data, error } = await supabase.from("trips").select("*");
  if (error) throw error;
  return data;
}

/**
 * Creates a new trip
 */
export async function createTrip(title: string, isPublic = false) {
  const { data, error } = await supabase
    .from("trips")
    .insert([{ title, public: isPublic }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Creates a new segment
 */
export async function createSegment(
  segmentName: string,
  trip_id: string,
  gpxPath: string
) {
  const { data, error } = await supabase
    .from("segments")
    .insert([{ name: segmentName, trip_id: trip_id, gpx_path: [gpxPath] }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Custom React hook to manage Supabase authentication state.
 * Fetches current user and listens for login/logout events.
 */
export function useSupabaseAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error("Error fetching user:", error);
      if (isMounted) {
        setUser(data.user);
        setLoading(false);
      }
    };
    getUser();

    // Listen for login/logout/session changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (isMounted) {
          setUser(session?.user ?? null);
        }
      }
    );

    // Cleanup on unmount
    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}

/**
 * One-time check for current user (non-reactive).
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }
  return data.user;
}
