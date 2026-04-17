// src/lib/stages.js
import { pb } from "./pb";

/**
 * Get a stage by its ID, with activities expanded (back relation)
 */
export async function fetchStageByIdWithActivities(stageId) {
  return await pb
    .collection("stages")
    .getFirstListItem(`id='${stageId}'`, { expand: "activities_via_stage" });
}

/**
 * Get a stage by its slug, with trip and activities expanded
 */
export async function fetchStageBySlug(slug) {
  return pb.collection("stages").getFirstListItem(`slug='${slug}'`, {
    sort: "-startDate",
    expand: "trip,activities_via_stage",
  });
}

/** Expand helper: stage record -> activities array */
export function getExpandedActivitiesForStage(stage) {
  return stage?.expand?.activities_via_stage || [];
}

export function activityGpxUrl(activity) {
  if (!activity?.gpxFile) return null;
  return pb.files.getURL(activity, activity.gpxFile);
}

export async function createStage(data) {
  return pb.collection("stages").create(data);
}

export async function updateStage(stageId, data) {
  return pb.collection("stages").update(stageId, data);
}

export async function deleteStage(stageId) {
  return pb.collection("stages").delete(stageId);
}

export async function deleteActivity(activityId) {
  return pb.collection("activities").delete(activityId);
}
