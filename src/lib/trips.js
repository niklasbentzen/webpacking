// src/lib/trips.js
import { pb } from "./pb";
import { getExpandedActivitiesForStage } from "./stages";

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
  let distanceKm = 0;
  let elevationM = 0;

  for (const stage of stages || []) {
    const acts = getExpandedActivitiesForStage(stage);
    activityCount += acts.length;

    for (const a of acts) {
      if (typeof a.distanceKm === "number") distanceKm += a.distanceKm;
      if (typeof a.elevationM === "number") elevationM += a.elevationM;
    }
  }

  return {
    stageCount,
    activityCount,
    distanceKm: distanceKm || null,
    elevationM: elevationM || null,
  };
}
