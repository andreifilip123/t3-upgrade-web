import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { z } from "zod";

const executeCommand = (command: string) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
};

const Params = z.object({
  currentVersion: z.string(),
  upgradeVersion: z.string(),
  features: z.object({
    nextAuth: z.boolean().optional(),
    prisma: z.boolean().optional(),
    trpc: z.boolean().optional(),
    tailwind: z.boolean().optional(),
  }),
});

type Params = z.infer<typeof Params>;

export default async function generateDiff(params: Params) {
  const { success } = Params.safeParse(params);
  if (!success) {
    return { error: "Invalid request body" };
  }
  const { currentVersion, upgradeVersion, features } = Params.parse(params);
  const featureFlags = Object.entries(features)
    .filter(([, value]) => value)
    .map(([key]) => `--${key}=true`)
    .join(" ");

  const currentProjectPath = path.join(process.cwd(), "current");
  const upgradeProjectPath = path.join(process.cwd(), "upgrade");

  // Make sure the directories don't exist
  await executeCommand(`rm -rf ${currentProjectPath}`);
  await executeCommand(`rm -rf ${upgradeProjectPath}`);

  // Create the diff directory if it doesn't exist
  await executeCommand(`mkdir -p ${path.join(process.cwd(), "diffs")}`);

  const getCommand = (version: string, path: string) =>
    `npx create-t3-app@${version} ${path} --CI ${featureFlags} --noGit --noInstall`;

  const getDiffPath = () => {
    const featuresString = Object.entries(features)
      .filter(([, value]) => value)
      .map(([key]) => key)
      .join("-");
    return path.join(
      process.cwd(),
      "diffs",
      `diff-${currentVersion}-${upgradeVersion}-${featuresString}.patch`
  );
  };

  const diffPath = getDiffPath();

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
      `rsync -a ${upgradeProjectPath}/ ${currentProjectPath}/`
    );

    // Generate the diff
    await executeCommand(
      `cd ${currentProjectPath} && git diff > ${diffPath} && cd ../`
    );

    // Read the diff
    const differences = fs.readFileSync(diffPath, "utf8");

    await executeCommand(`rm -rf ${currentProjectPath}`);
    await executeCommand(`rm -rf ${upgradeProjectPath}`);

    // Send the diff back to the client
    return { differences };
  } catch (error) {
    return { error };
  }
}
