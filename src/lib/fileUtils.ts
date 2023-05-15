import path from "path";
import { getFeaturesString, type Features } from "./utils";

export interface DiffLocation {
  currentVersion: string;
  upgradeVersion: string;
  features: Features;
}

export const getDiffPath = ({
  currentVersion,
  upgradeVersion,
  features,
}: DiffLocation) => {
  const featuresString = getFeaturesString(features);
  return path.join(
    process.cwd(),
    "diffs",
    `diff-${currentVersion}-${upgradeVersion}${
      featuresString ? `-${featuresString}` : ""
    }.patch`
  );
};
