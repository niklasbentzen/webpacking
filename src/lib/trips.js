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
  console.log(stages);

  let activityCount = 0;
  let distanceM = 0;
  let elevationGainM = 0;

  let firstStartTime = null;
  let lastEndTime = null;

  for (const stage of stages || []) {
    const activities = stage.expand?.activities_via_stage || [];
    activityCount += activities.length;

    for (const a of activities) {
      if (typeof a.distanceM === "number") distanceM += a.distanceM;
      if (typeof a.elevationGainM === "number")
        elevationGainM += a.elevationGainM;

      if (a.startTime != null) {
        const t = new Date(a.startTime).getTime();
        if (firstStartTime == null || t < firstStartTime) {
          firstStartTime = t;
        }
      }

      if (a.endTime != null) {
        const t = new Date(a.endTime).getTime();
        if (lastEndTime == null || t > lastEndTime) {
          lastEndTime = t;
        }
      }
    }
  }
  console.log(firstStartTime, lastEndTime);

  return {
    stageCount,
    activityCount,
    distanceM: distanceM || 0,
    elevationM: elevationGainM || 0,
    startTime: firstStartTime != null ? new Date(firstStartTime) : null,
    endTime: lastEndTime != null ? new Date(lastEndTime) : null,
  };
}

export function updateTrip(tripId, data) {
  return pb.collection("trips").update(tripId, data);
}
