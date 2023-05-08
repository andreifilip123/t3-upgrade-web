import { getMissingDiffs } from "./fileUtils";
import generateDiff from "./generateDiff";
import { extractVersionsAndFeatures } from "./utils";

const generateAllMissingDiffs = async () => {
  console.log("Generating all missing diffs");
  const missingDiffs = await getMissingDiffs(Infinity);

  const batchSize = 20;

  const batchedMissingDiffs = [];
  for (let i = 0; i < missingDiffs.length; i += batchSize) {
    batchedMissingDiffs.push(missingDiffs.slice(i, i + batchSize));
  }

  for (const batch of batchedMissingDiffs) {
    const promises = batch.map((diffLocation) => {
      const versionsAndFeatures = extractVersionsAndFeatures(diffLocation);

      if (!versionsAndFeatures) {
        return { error: "Invalid diff location", differences: undefined };
      }

      return generateDiff(versionsAndFeatures);
    });

    await Promise.all(promises);
    console.count("Generated batch");
  }
};

export default generateAllMissingDiffs;
