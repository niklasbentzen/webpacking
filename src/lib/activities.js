import { pb } from "./pb";

// Fetch all activities for a list of stage records (sorted server-side per stage)
export async function fetchActivitiesForStages(stages) {
  if (!stages?.length) return [];

  const all = [];
  for (const stage of stages) {
    const res = await pb.collection("activities").getFullList({
      filter: `stage = '${stage.id}'`,
      sort: "startTime",
    });
    all.push(...res);
  }
  return all;
}

// Update activity
export async function updateActivity(id, data) {
  return await pb.collection("activities").update(id, data);
}
