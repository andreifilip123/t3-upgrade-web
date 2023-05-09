import fs from "fs";
import path from "path";
import { z } from "zod";
import { executeCommand, getDiffPath } from "./fileUtils";
import { getFeaturesString } from "./utils";

export const paramsSchema = z.object({
  currentVersion: z.string(),
  upgradeVersion: z.string(),
  features: z.object({
    nextAuth: z.boolean().optional(),
    prisma: z.boolean().optional(),
    trpc: z.boolean().optional(),
    tailwind: z.boolean().optional(),
  }),
});

type Params = z.infer<typeof paramsSchema>;

export default async function generateDiff(params: Params) {
  const { success } = paramsSchema.safeParse(params);
  if (!success) {
    return { error: "Invalid request body" };
  }
  const { currentVersion, upgradeVersion, features } =
    paramsSchema.parse(params);
  const featureFlags = Object.entries(features)
    .filter(([, value]) => value)
    .map(([key]) => `--${key}=true`)
    .join(" ");

  const diffPath = getDiffPath({ currentVersion, upgradeVersion, features });
  const featuresString = getFeaturesString(features);
  const diffDir = `/tmp/${currentVersion}..${upgradeVersion}${
    featuresString ? `-${featuresString}` : ""
  }`;

  const currentProjectPath = path.join(diffDir, "current");
  const upgradeProjectPath = path.join(diffDir, "upgrade");

  // Make sure the directories don't exist
  await executeCommand(`rm -rf ${currentProjectPath}`);
  await executeCommand(`rm -rf ${upgradeProjectPath}`);

  const getCommand = (version: string, path: string) =>
    `npm_config_cache=/tmp/ npx create-t3-app@${version} ${path} --CI ${featureFlags} --noGit --noInstall`;

  if (fs.existsSync(diffPath)) {
    console.log("Diff already exists, reading from disk", diffPath);
    const differences = fs.readFileSync(diffPath, "utf8");

    return { differences };
  }

  console.log("Diff does not exist, generating", diffPath);

  try {
    await executeCommand(getCommand(currentVersion, currentProjectPath));
    await executeCommand(getCommand(upgradeVersion, upgradeProjectPath));

    // Git init the current project
    await executeCommand(`cd ${currentProjectPath}`);
    await executeCommand(`git init`);
    await executeCommand(`git add .`);
    await executeCommand(`git commit -m "Initial commit"`);
    await executeCommand(`cd ../`);

    console.log("Created git repo for current project");

    // Move the upgrade project over the current project
    await executeCommand(
      `rsync -a --delete --exclude=.git/ ${upgradeProjectPath}/ ${currentProjectPath}/`
    );

    console.log("Moved upgrade project over current project");

    // Generate the diff
    await executeCommand(`cd ${currentProjectPath}`);
    await executeCommand(`git add .`);
    await executeCommand(`git diff --staged > ${diffPath}`);
    await executeCommand(`cd ../`);

    // Read the diff
    const differences = fs.readFileSync(diffPath, "utf8");

    await executeCommand(`rm -rf ${diffDir}`);

    // Send the diff back to the client
    return { differences };
  } catch (error) {
    return { error };
  }
}
