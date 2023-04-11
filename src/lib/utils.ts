import clsx, { type ClassValue } from "clsx";
import path from "path";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

interface Release {
  tag_name: string;
}

export interface VersionsGroupedByMajor {
  [major: string]: string[];
}

export const getT3Versions = async () => {
  const response = await fetch(
    "https://api.github.com/repos/t3-oss/create-t3-app/releases"
  );
  const data = (await response.json()) as Release[];
  const versions = data.map((release) => release.tag_name.split("@")[1] ?? "");
  const actualVersions = versions.filter((version) => version !== "");

  return actualVersions;
};

export const getT3VersionsGroupedByMajor = async () => {
  const actualVersions = await getT3Versions();

  const versionsGroupedByMajor: VersionsGroupedByMajor = {};

  actualVersions.forEach((version) => {
    const [major] = version.split(".");
    if (!major) {
      return;
    }
    if (!versionsGroupedByMajor[major]) {
      versionsGroupedByMajor[major] = [];
    }
    versionsGroupedByMajor[major]?.push(version);
  });

  return versionsGroupedByMajor;
};

interface Features {
  nextAuth?: boolean;
  prisma?: boolean;
  trpc?: boolean;
  tailwind?: boolean;
}

export const getFeaturesString = (features: Features) => {
  return Object.entries(features)
    .filter(([, value]) => value)
    .map(([key]) => key)
    .join("-");
};

export const getFeatureUrl = (feature: string) => {
  if (feature === "nextAuth") {
    return "https://next-auth.js.org/";
  } else if (feature === "prisma") {
    return "https://www.prisma.io/";
  } else if (feature === "trpc") {
    return "https://trpc.io/";
  } else if (feature === "tailwind") {
    return "https://tailwindcss.com/";
  }
};

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
    `diff-${currentVersion}-${upgradeVersion}-${featuresString}.patch`
  );
};
