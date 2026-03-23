import { pb } from "./pb";

export async function fetchHaikuFromStageId(stageId) {
  return pb.collection("haiku").getFullList(stageId, {
    sort: "-date",
  });
}
