import { Octokit } from "@octokit/rest";

import { env } from "@/env.mjs";
import { getFeaturesString, type Features } from "./utils";

export interface DiffLocation {
  currentVersion: string;
  upgradeVersion: string;
  features: Features;
}

const octokit = new Octokit({
  auth: env.GITHUB_PERSONAL_ACCESS_TOKEN,
});

export const getDiffFromGithub = async (props: DiffLocation) => {
  const featuresString = getFeaturesString(props.features);
  const path = `diffs/diff-${props.currentVersion}-${props.upgradeVersion}${
    featuresString ? `-${featuresString}` : ""
  }.patch`;

  const { data } = await octokit.repos.getContent({
    owner: env.GITHUB_DIFFS_OWNER,
    repo: env.GITHUB_DIFFS_REPO,
    path,
  });

  if (Array.isArray(data)) {
    throw new Error("No file found");
  }

  const downloadUrl = data.download_url;
  if (!downloadUrl) {
    throw new Error("No download url found");
  }

  const response = await fetch(downloadUrl);

  if (!response.ok) {
    throw new Error("Failed to download diff");
  }

  return response.text();
};
