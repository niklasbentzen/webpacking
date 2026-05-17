import { pb } from "./pb";

export async function fetchActivityStatsForTrip(tripId) {
  return pb.collection("activityStats").getFullList({
    filter: `statistic.trip='${tripId}'`,
    expand: "statistic,activity",
  });
}

export async function fetchActivityStatsForActivity(activityId) {
  return pb.collection("activityStats").getFullList({
    filter: `activity='${activityId}'`,
    expand: "statistic",
  });
}

export async function upsertActivityStat(activityId, statisticId, count) {
  try {
    const existing = await pb
      .collection("activityStats")
      .getFirstListItem(`activity='${activityId}' && statistic='${statisticId}'`);
    return pb.collection("activityStats").update(existing.id, { count });
  } catch {
    return pb.collection("activityStats").create({ activity: activityId, statistic: statisticId, count });
  }
}

export async function deleteActivityStat(activityStatId) {
  return pb.collection("activityStats").delete(activityStatId);
}
