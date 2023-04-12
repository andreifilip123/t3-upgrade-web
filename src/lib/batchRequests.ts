import { getMissingDiffs } from "./fileUtils";
import generateDiff from "./generateDiff";
import { extractVersionsAndFeatures } from "./utils";

export default async function batchRequests(count: number) {
  const missingDiffs = await getMissingDiffs(count);

  const promises = missingDiffs.map((diffLocation) =>
    generateDiff(extractVersionsAndFeatures(diffLocation))
  );

  const responses = await Promise.all(promises);

  return responses;
}
