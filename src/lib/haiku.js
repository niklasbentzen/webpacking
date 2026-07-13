import { pb } from "./pb";

export async function fetchHaikuFromStageId(stageId) {
  return pb.collection("haikus").getFullList({
    filter: `stage = '${stageId}'`,
    sort: "date",
  });
}

export async function createHaiku(data) {
  return pb.collection("haikus").create(data);
}

export async function updateHaiku(id, data) {
  return pb.collection("haikus").update(id, data);
}

export async function deleteHaiku(id) {
  return pb.collection("haikus").delete(id);
}
