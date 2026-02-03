// src/lib/trips.js
import { pb } from "./pb";
import { getExpandedActivitiesForStage } from "./stages";

/**
 * Fetch all published trips, sorted by startDate descending
 */
export async function fetchAllTrips() {
  return pb.collection("trips").getFullList({
    filter: "published = true",
    sort: "-startDate",
  });
}

/**
 * Fetch all published trips with their stages expanded
 */
export async function fetchAllTripsWithStages() {
  return pb.collection("trips").getFullList({
    filter: "published = true",
    sort: "-startDate",
    expand: "stages_via_trip",
  });
}

/**
 * Fetch a single trip by its ID with stages expanded
 */
export async function fetchTripByIdWithStages(tripId) {
  return pb.collection("trips").getOne(tripId, {
    sort: "-startDate",
    expand: "stages_via_trip",
  });
}

/**
 * Fetch a single trip by its slug
 */
export async function fetchTripBySlug(slug) {
  return pb.collection("trips").getFirstListItem(`slug='${slug}'`);
}

/**
 * Fetch all stages for a trip with activities expanded (back relation):
 * - stages.expand.activities_via_stage[]
 */
export async function fetchStagesForTripWithActivities(tripId) {
  return pb.collection("stages").getFullList({
    filter: `published = true && trip = '${tripId}'`,
    sort: "startDate",
    expand: "activities_via_stage",
  });
}

export function summarizeTripFromStages(stages) {
  const stageCount = stages?.length || 0;

  let activityCount = 0;
  let distanceM = 0;
  let elevationM = 0;

  for (const stage of stages || []) {
    const acts = getExpandedActivitiesForStage(stage);
    activityCount += acts.length;

    for (const a of acts) {
      if (typeof a.distanceM === "number") distanceM += a.distanceM;
      if (typeof a.elevationM === "number") elevationM += a.elevationM;
    }
  }

  return {
    stageCount,
    activityCount,
    distanceM: distanceM || 0,
    elevationM: elevationM || 0,
  };
}
