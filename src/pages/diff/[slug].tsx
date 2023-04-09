import { getT3Versions } from "@/lib/utils";
import { GetStaticProps, NextPage } from "next";
import { Diff, FileData, Hunk, parseDiff } from "react-diff-view";

import generateDiff from "@/lib/generateDiff";

export const getStaticPaths = async () => {
  const t3Versions = await getT3Versions();
  const latestVersion = t3Versions.shift();
  const mostRecentT3Versions = t3Versions.slice(0, 10);

  return {
    paths: mostRecentT3Versions.map((version) => ({
      params: {
        slug: `${latestVersion}..${version}-nextAuth-prisma-trpc-tailwind`,
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

const extractVersionsAndFeatures = (slug: string) => {
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
  return { currentVersion, upgradeVersion, nextAuth, prisma, trpc, tailwind };
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
    return {
      props: {
        diffText: "",
      },
    };
  }

  const versionsAndFeatures = extractVersionsAndFeatures(params.slug as string);

  if (!versionsAndFeatures) {
    return {
      props: {
        diffText: "",
      },
    };
  }

  const { currentVersion, upgradeVersion, nextAuth, prisma, trpc, tailwind } =
    versionsAndFeatures;

  const features = {
    nextAuth: !!nextAuth,
    prisma: !!prisma,
    trpc: !!trpc,
    tailwind: !!tailwind,
  };

  const response = await generateDiff({
    currentVersion,
    upgradeVersion,
    features,
  });

  const { differences, error } = response;

  if (error || !differences) {
    return {
      props: {
        diffText: "",
      },
    };
  }

  return {
    props: {
      diffText: differences,
    },
  };
};

const DiffPage: NextPage<{ diffText: string }> = ({ diffText }) => {
  if (!diffText) {
    return <div>Diff not found</div>;
  }

  const files = parseDiff(diffText);

  const renderFile = ({ oldRevision, newRevision, type, hunks }: FileData) => (
    <Diff
      key={oldRevision + "-" + newRevision}
      viewType="split"
      diffType={type}
      hunks={hunks}
    >
      {(hunks) => hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)}
    </Diff>
  );

  return <div>{files.map(renderFile)}</div>;
};

export default DiffPage;
