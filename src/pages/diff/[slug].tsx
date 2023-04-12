import {
  extractVersionsAndFeatures,
  getFeatureUrl,
  getFeaturesString,
  getT3Versions,
} from "@/lib/utils";
import type { File as FileData, Hunk as HunkData } from "gitdiff-parser";
import { type GetStaticProps, type NextPage } from "next";
import {
  Decoration,
  Diff,
  Hunk,
  parseDiff,
  type ViewType,
} from "react-diff-view";

import { type DiffLocation } from "@/lib/fileUtils";
import generateDiff from "@/lib/generateDiff";
import fs from "fs";
import { CheckIcon, XIcon } from "lucide-react";
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

  const files = parseDiff(diffText ?? "");

  const [expandedDiffs, setExpandedDiffs] = useState<boolean[]>(
    Array.from({ length: files.length }, () => true)
  );

  if (router.isFallback) {
    return <div>Loading...</div>;
  }

  const renderHunk = (hunk: HunkData) => (
    <>
      <Decoration
        key={`decoration-${hunk.content}`}
        className="bg-gray-100 text-gray-400"
      >
        <span className="pl-20">{hunk.content}</span>
      </Decoration>
      <Hunk key={`hunk-${hunk.content}`} hunk={hunk} />
    </>
  );

  const FileComponent = ({
    file,
    isExpanded,
    setIsExpanded,
  }: {
    file: FileData;
    isExpanded: boolean;
    setIsExpanded: (a: boolean) => void;
  }) => {
    const { oldRevision, newRevision, type, hunks, oldPath, newPath } = file;

    return (
      <div key={`${oldRevision}-${newRevision}`}>
        <button
          className={`flex w-full flex-row justify-between p-4 font-mono ${
            isExpanded ? "border-b-2" : ""
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex flex-row gap-4">
            <div className="my-auto rounded-[4px] border border-gray-500 px-1 text-gray-500">
              {type === "modify"
                ? "CHANGED"
                : type === "add"
                ? "ADDED"
                : type === "delete"
                ? "DELETED"
                : "UNKNOWN"}
            </div>
            <h1>
              {oldPath === "/dev/null"
                ? newPath
                : newPath === "/dev/null"
                ? oldPath
                : oldPath === newPath
                ? newPath
                : oldPath + " → " + newPath}
            </h1>
          </div>

          <div className="my-auto rounded-[4px] border border-gray-500 px-1 text-gray-500">
            {isExpanded ? "Collapse" : "Expand"}
          </div>
        </button>
        {isExpanded && (
          <Diff viewType={viewType} diffType={type} hunks={hunks}>
            {(hunks) => hunks.map(renderHunk)}
          </Diff>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gray-200 py-4">
      <h1 className="mb-4 text-center text-4xl font-extrabold tracking-tight sm:text-5xl">
        Changes from {versionsAndFeatures?.currentVersion} to{" "}
        {versionsAndFeatures?.upgradeVersion}
      </h1>
      <ul className="mx-2 my-3 grid grid-cols-1 justify-center gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        {Object.entries(versionsAndFeatures.features).map(
          ([feature, enabled]) => (
            <li
              key={feature}
              className="col-span-1 flex rounded-md border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
            >
              <div
                className={`flex w-16 shrink-0 items-center justify-center rounded-l-md text-sm font-medium text-white ${
                  enabled ? "bg-green-500" : "bg-red-500"
                }`}
              >
                {enabled ? <CheckIcon /> : <XIcon />}
              </div>
              <button
                className="flex flex-1 items-center justify-between truncate rounded-r-md px-4 py-2 text-left"
                onClick={() => window.open(getFeatureUrl(feature), "_blank")}
              >
                <div className="flex-1 truncate text-sm">
                  <span className="font-medium text-gray-900 hover:text-gray-600">
                    {feature}
                  </span>
                </div>
                <div className="shrink-0 pr-2">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                    <span className="sr-only">Open website</span>
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            </li>
          )
        )}
      </ul>

      <div className="flex flex-col items-center">
        <div className="flex">
          <button
            className={`${
              viewType === "split" ? "bg-gray-300" : "bg-gray-200"
            } rounded-l-xl border-y border-l border-gray-300 px-4 py-2 transition-all`}
            onClick={() => setViewType("split")}
          >
            Split
          </button>
          <button
            className={`${
              viewType === "unified" ? "bg-gray-300" : "bg-gray-200"
            } rounded-r-xl border-y border-r border-gray-300 px-4 py-2 transition-all`}
            onClick={() => setViewType("unified")}
          >
            Unified
          </button>
        </div>
      </div>

      {files.map((file, index) => (
        <div
          key={file.newPath}
          className="m-2 my-4 rounded-xl bg-white shadow-lg"
        >
          <FileComponent
            file={file}
            isExpanded={expandedDiffs[index] ?? true}
            setIsExpanded={(a) => {
              expandedDiffs[index] = a;
              setExpandedDiffs([...expandedDiffs]);
            }}
          />
        </div>
      ))}
    </main>
  );
};

export default DiffPage;
