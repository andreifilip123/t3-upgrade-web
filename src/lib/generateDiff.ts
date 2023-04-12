import fs from "fs";
import path from "path";
import { z } from "zod";
import { executeCommand, getDiffPath } from "./fileUtils";

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

  const currentProjectPath = path.join(process.cwd(), "current");
  const upgradeProjectPath = path.join(process.cwd(), "upgrade");

  // Make sure the directories don't exist
  await executeCommand(`rm -rf ${currentProjectPath}`);
  await executeCommand(`rm -rf ${upgradeProjectPath}`);

  const getCommand = (version: string, path: string) =>
    `npx create-t3-app@${version} ${path} --CI ${featureFlags} --noGit --noInstall`;

  const diffPath = getDiffPath({ currentVersion, upgradeVersion, features });

  if (fs.existsSync(diffPath)) {
    const differences = fs.readFileSync(diffPath, "utf8");

    return { differences };
  }

  try {
    await executeCommand(getCommand(currentVersion, currentProjectPath));
    await executeCommand(getCommand(upgradeVersion, upgradeProjectPath));

    // Git init the current project
    await executeCommand(`
      cd ${currentProjectPath} &&
      git init &&
      git add . &&
      git commit -m "Initial commit" &&
      cd ../
    `);

    // Move the upgrade project over the current project
    await executeCommand(
      `rsync -a --delete --exclude=.git/ ${upgradeProjectPath}/ ${currentProjectPath}/`
    );

    // Generate the diff
    await executeCommand(`
      cd ${currentProjectPath} && 
      git add . &&
      git diff --staged > ${diffPath} && 
      cd ../
    `);

    // Read the diff
    const differences = fs.readFileSync(diffPath, "utf8");

    await executeCommand(`rm -rf ${currentProjectPath}`);
    await executeCommand(`rm -rf ${upgradeProjectPath}`);

    const diffsFolder = path.join(process.cwd(), "diffs");

    // Stage and commit all the changes in the diff directory
    await executeCommand(`
      git add ${diffsFolder} &&
      git commit -m "Update diffs" &&
      git push
    `);

    // Send the diff back to the client
    return { differences };
  } catch (error) {
    return { error };
  }
}
