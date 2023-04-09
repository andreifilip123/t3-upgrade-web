import { exec } from "child_process";
import fs from "fs";
import { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import { z } from "zod";

const executeCommand = (command: string) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
};

const Body = z.object({
  currentVersion: z.string(),
  upgradeVersion: z.string(),
  features: z.object({
    nextAuth: z.boolean(),
    prisma: z.boolean(),
    trpc: z.boolean(),
    tailwind: z.boolean(),
  }),
});

type Body = z.infer<typeof Body>;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { success } = Body.safeParse(req.body);
  if (!success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { currentVersion, upgradeVersion, features } = Body.parse(req.body);
  const featureFlags = Object.entries(features)
    .filter(([, value]) => value)
    .map(([key]) => `--${key}=true`)
    .join(" ");

  const currentProjectPath = path.join(__dirname, "current");
  const upgradeProjectPath = path.join(__dirname, "upgrade");

  // Make sure the directories don't exist
  await executeCommand(`rm -rf ${currentProjectPath}`);
  await executeCommand(`rm -rf ${upgradeProjectPath}`);

  const getCommand = (version: string, path: string) =>
    `npx create-t3-app@${version} ${path} --CI ${featureFlags} --noGit --noInstall`;

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
      `cd ${currentProjectPath} && git diff > ../diff-${currentVersion}-${upgradeVersion}.patch && cd ../`
    );

    // Read the diff
    const differences = fs.readFileSync(
      path.join(__dirname, `diff-${currentVersion}-${upgradeVersion}.patch`),
      "utf8"
    );

    // Send the diff back to the client
    res.status(200).json({ differences });
  } catch (error) {
    res.status(500).json({ error: error });
  }
}
