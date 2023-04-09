import clsx, { type ClassValue } from "clsx";
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
  const data: Release[] = await response.json();
  const versions = data.map((release) => release.tag_name.split("@")[1] ?? "");
  const actualVersions = versions.filter((version) => version !== "");

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