import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { type DiffLocation } from "./fileUtils";

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

export interface Features {
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

type VersionAndFeaturesRegex = {
  currentVersion: string;
  upgradeVersion: string;
  nextAuth: string | null;
  prisma: string | null;
  trpc: string | null;
  tailwind: string | null;
};

export const extractVersionsAndFeatures = (
  slug: string
): DiffLocation | null => {
  const regex =
    /(?<currentVersion>\d+\.\d+\.\d+)\.\.(?<upgradeVersion>\d+\.\d+\.\d+)(?:-(?<nextAuth>nextAuth))?(?:-(?<prisma>prisma))?(?:-(?<trpc>trpc))?(?:-(?<tailwind>tailwind))?/;
  const match =
    (slug.match(regex) as RegExpMatchArray & {
      groups: VersionAndFeaturesRegex;
    }) || null;

  if (!match) {
    return null;
  }

  const { currentVersion, upgradeVersion, nextAuth, prisma, trpc, tailwind } =
    match.groups;
  return {
    currentVersion,
    upgradeVersion,
    features: {
      nextAuth: !!nextAuth,
      prisma: !!prisma,
      trpc: !!trpc,
      tailwind: !!tailwind,
    },
  };
};

export const arrangements = (array: string[]) => {
  const result: string[][] = [[]];

  for (const element of array) {
    const length = result.length;
    for (let i = 0; i < length; i++) {
      const subset = result[i]!.slice();
      subset.push(element);
      result.push(subset);
    }
  }

  return result
    .filter((subset) => subset.length > 0)
    .map((subset) => subset.sort().join("-"));
};
