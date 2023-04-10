import {
  getFeaturesString,
  getT3Versions,
  type DiffLocation,
} from "@/lib/utils";
import { type File as FileData } from "gitdiff-parser";
import { type GetStaticProps, type NextPage } from "next";
import { Diff, Hunk, ViewType, parseDiff } from "react-diff-view";

import generateDiff from "@/lib/generateDiff";
import fs from "fs";
import { useRouter } from "next/router";
import path from "path";
import { useState } from "react";

export const getStaticPaths = async () => {
  const t3Versions = await getT3Versions();
  const sortedT3Versions = t3Versions.sort((a, b) => {
    const aParts = a.split(".").map(Number);
    const bParts = b.split(".").map(Number);

    for (let i = 0; i < aParts.length; i++) {
      const aPart = aParts[i] as number;
      const bPart = bParts[i] as number;
      if (aPart > bPart) {
        return 1;
      } else if (aPart < bPart) {
        return -1;
      }
    }

    return 0;
  });

  const latestVersion = sortedT3Versions[sortedT3Versions.length - 1] as string;

  const existingDiffs = fs.readdirSync(path.join(process.cwd(), "diffs"));

  const diffsMap: { [key: string]: boolean } = existingDiffs.reduce(
    (acc, diff) => {
      const versionsAndFeatures = extractVersionsAndFeatures(diff);

      if (!versionsAndFeatures) {
        return acc;
      }

      const { currentVersion, upgradeVersion, features } = versionsAndFeatures;

      return {
        ...acc,
        [`${currentVersion}..${upgradeVersion}-${getFeaturesString(features)}`]:
          true,
      };
    },
    {}
  );

  const newT3Versions = sortedT3Versions.filter((version) => {
    const key = `${version}..${latestVersion}-nextAuth-prisma-trpc-tailwind`;
    // remove existing diffs
    if (diffsMap[key]) {
      return false;
    }

    return true;
  });

  const mostRecentT3Versions = newT3Versions.slice(
    Math.min(newT3Versions.length - 10, 10)
  );

  mostRecentT3Versions.forEach((version) => {
    diffsMap[`${version}..${latestVersion}-nextAuth-prisma-trpc-tailwind`] =
      true;
  });

  return {
    paths: Object.keys(diffsMap).map((slug) => ({
      params: {
        slug,
      },
    })),
    fallback: true,
  };
};

type VersionAndFeatures = {
  currentVersion: string;
  upgradeVersion: string;
  nextAuth: string | null;
  prisma: string | null;
  trpc: string | null;
  tailwind: string | null;
};

const extractVersionsAndFeatures = (slug: string): DiffLocation | null => {
  const regex =
    /(?<currentVersion>\d+\.\d+\.\d+)\.\.(?<upgradeVersion>\d+\.\d+\.\d+)(?:-(?<nextAuth>nextAuth))?(?:-(?<prisma>prisma))?(?:-(?<trpc>trpc))?(?:-(?<tailwind>tailwind))?/;
  const match =
    (slug.match(regex) as RegExpMatchArray & { groups: VersionAndFeatures }) ||
    null;

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

type Props = {
  diffText: string;
};

type Params = {
  slug: string;
};

export const getStaticProps: GetStaticProps<Props, Params> = async (
  context
) => {
  const { params } = context;

  if (!params?.slug) {
    console.warn("No slug provided");
    return {
      notFound: true,
    };
  }

  const versionsAndFeatures = extractVersionsAndFeatures(params.slug);

  if (!versionsAndFeatures) {
    console.warn("No versions and features provided");
    return {
      notFound: true,
    };
  }

  const { currentVersion, upgradeVersion, features } = versionsAndFeatures;

  const response = await generateDiff({
    currentVersion,
    upgradeVersion,
    features,
  });

  const { differences, error } = response;

  if (error || !differences) {
    console.warn("Error generating diff", error, differences);
    return {
      notFound: true,
    };
  }

  return {
    props: {
      diffText: differences,
      versionsAndFeatures,
    },
  };
};

const DiffPage: NextPage<{
  diffText: string;
  versionsAndFeatures: DiffLocation;
}> = ({ diffText, versionsAndFeatures }) => {
  const router = useRouter();
  const [viewType, setViewType] = useState<ViewType>("split");

  if (router.isFallback) {
    return <div>Loading...</div>;
  }

  const files = parseDiff(diffText);

  const renderFile = ({ oldRevision, newRevision, type, hunks }: FileData) => (
    <Diff
      key={`${oldRevision}-${newRevision}`}
      viewType={viewType}
      diffType={type}
      hunks={hunks}
    >
      {(hunks) => hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)}
    </Diff>
  );

  return (
    <main className="bg-gray-200 py-4">
      <h1 className="mb-4 text-center text-4xl font-extrabold tracking-tight sm:text-5xl">
        Changes from {versionsAndFeatures?.currentVersion} to{" "}
        {versionsAndFeatures?.upgradeVersion}
      </h1>
      <ul className="mb-2 flex flex-wrap justify-center">
        {Object.entries(versionsAndFeatures.features).map(
          ([feature, enabled]) => (
            <li
              key={feature}
              className={`${
                enabled ? "bg-green-500" : "bg-gray-500"
              } m-2 rounded-lg p-3 font-bold text-white shadow-lg`}
            >
              {feature}
            </li>
          )
        )}
      </ul>
      <div className="flex flex-col items-center">
        <div className="flex">
          <button
            className={`${
              viewType === "split" ? "bg-gray-300" : "bg-gray-200"
            } rounded-l-xl border-b border-l border-t border-gray-300 px-4 py-2 transition-all`}
            onClick={() => setViewType("split")}
          >
            Split
          </button>
          <button
            className={`${
              viewType === "unified" ? "bg-gray-300" : "bg-gray-200"
            } rounded-r-xl border-b border-r border-t border-gray-300 px-4 py-2 transition-all`}
            onClick={() => setViewType("unified")}
          >
            Unified
          </button>
        </div>
      </div>

      {files.map((file) => (
        <div
          key={file.newPath}
          className="m-2 my-4 rounded-xl bg-white p-2 shadow-lg"
        >
          <h1 className="my-2 text-center text-2xl font-bold">
            {file.oldPath === file.newPath
              ? file.newPath
              : file.oldPath + " → " + file.newPath}
          </h1>
          {renderFile(file)}
        </div>
      ))}
    </main>
  );
};

export default DiffPage;
