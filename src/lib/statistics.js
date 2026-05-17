import { pb } from "./pb";

export async function fetchStatisticsForTrip(tripId) {
  return pb.collection("statistics").getFullList({
    filter: `trip='${tripId}'`,
    sort: "name",
  });
}

export async function createStatistic(tripId, name) {
  return pb.collection("statistics").create({ trip: tripId, name });
}

export async function deleteStatistic(statisticId) {
  return pb.collection("statistics").delete(statisticId);
}

export async function updateStatistic(statisticId, name) {
  return pb.collection("statistics").update(statisticId, { name });
}
