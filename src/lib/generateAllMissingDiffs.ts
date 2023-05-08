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

    const timeStart = performance.now();
    await Promise.all(promises);
    const timeEnd = performance.now();
    console.count("Generated batch");
    console.log(`Batch took ${timeEnd - timeStart}ms`);
  }
};

generateAllMissingDiffs()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });