import { pb } from "./pb";

export async function fetchHaikuFromStageId(stageId) {
  return pb.collection("haikus").getFullList({
    filter: `stage = '${stageId}'`,
    sort: "date",
  });
}
