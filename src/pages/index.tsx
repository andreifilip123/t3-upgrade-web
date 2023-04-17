import { Checkbox } from "@/components/ui/Checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  getT3VersionsGroupedByMajor,
  type Features,
  type VersionsGroupedByMajor,
} from "@/lib/utils";
import { type NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

const UpgradePanel: React.FC<{
  loading: boolean;
  versionOptions: VersionsGroupedByMajor;
}> = ({ loading, versionOptions }) => {
  const router = useRouter();

  const [currentVersion, setCurrentVersion] = useState<string>();
  const [upgradeVersion, setUpgradeVersion] = useState<string>();
  const [features, setFeatures] = useState<Features>({
    nextAuth: false,
    prisma: false,
    trpc: false,
    tailwind: false,
  });

  const upgradeVersionOptions = useMemo(() => {
    if (!currentVersion) return versionOptions;
    const [major, minor, patch] = currentVersion.split(".");

    // filter out versions that are older than the current version
    const filteredVersions = versionOptions
      .filter((option) => Number(option.major) >= Number(major))
      .reduce<VersionsGroupedByMajor>((acc, option) => {
        if (Number(option.major) === Number(major)) {
          acc.push({
            major: option.major,
            versions: (
              versionOptions.find((v) => v.major === option.major)?.versions ??
              []
            ).filter((version) => {
              const [, versionMinor, versionPatch] = version.split(".");
              if (Number(versionMinor) > Number(minor)) return true;
              if (
                Number(versionMinor) === Number(minor) &&
                Number(versionPatch) > Number(patch)
              )
                return true;
              return false;
            }),
          });
        } else {
          acc.push({
            major: option.major,
            versions:
              versionOptions.find((v) => v.major === option.major)?.versions ??
              [],
          });
        }

        return acc;
      }, []);

    // if only one major version is available and it has no versions, return empty object
    if (
      filteredVersions.length === 1 &&
      (filteredVersions[0]?.versions.length ?? []) === 0
    )
      return [];

    return filteredVersions;
  }, [currentVersion, versionOptions]);

  const renderSelectContent = (options: VersionsGroupedByMajor) => {
    if (!options.length) return null;

    return options
      .filter((option) => option.versions.length > 0)
      .map((option) => (
        <SelectGroup key={option.major}>
          <SelectLabel>{`${option.major}.x`}</SelectLabel>
          {option.versions.map((minorVersion) => (
            <SelectItem key={minorVersion} value={minorVersion}>
              {minorVersion}
            </SelectItem>
          ))}
        </SelectGroup>
      ));
  };

  const noUpgradeAvailable = upgradeVersionOptions.length === 0;

  const goToDiff = () => {
    if (!currentVersion || !upgradeVersion) return;
    const activeFeatures = Object.keys(features).filter(
      (feature) => features[feature as keyof typeof features]
    );
    const featuresString = activeFeatures.join("-");

    const url = `/diff/${currentVersion}..${upgradeVersion}${
      featuresString ? `-${featuresString}` : ""
    }`;

    void router.push(url);
  };

  useEffect(() => {
    if (noUpgradeAvailable) {
      setUpgradeVersion(undefined);
    } else {
      setUpgradeVersion(upgradeVersionOptions[0]!.versions[0]);
    }
  }, [noUpgradeAvailable, upgradeVersionOptions]);

  if (loading) return <span className="text-white">Loding versions...</span>;

  return (
    <>
      <div className="flex items-center gap-6">
        <div>
          <p className="text-xl text-white">Current version:</p>
          <Select onValueChange={(value) => setCurrentVersion(value)}>
            <SelectTrigger className="w-[180px] text-white">
              <SelectValue placeholder="Select version" />
            </SelectTrigger>
            <SelectContent>{renderSelectContent(versionOptions)}</SelectContent>
          </Select>
        </div>

        <div>
          <p className="text-xl text-white">Upgrade to:</p>

          <Select
            onValueChange={(value) => setUpgradeVersion(value)}
            disabled={!!noUpgradeAvailable}
            defaultValue={
              noUpgradeAvailable
                ? undefined
                : upgradeVersionOptions[0]!.versions[0]
            }
          >
            <SelectTrigger className="w-[180px] text-white">
              <SelectValue
                placeholder={
                  noUpgradeAvailable ? "No upgrade available" : "Select version"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {renderSelectContent(upgradeVersionOptions)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-6 text-white">
        {Object.keys(features).map((feature) => (
          <div className="flex items-center space-x-4" key={feature}>
            <Checkbox
              id={feature}
              checked={features[feature as keyof typeof features]}
              onCheckedChange={(value) =>
                value !== "indeterminate"
                  ? setFeatures((prev) => ({
                      ...prev,
                      [feature]: value,
                    }))
                  : null
              }
            />
            <label
              htmlFor={feature}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {feature}
            </label>
          </div>
        ))}
      </div>

      <button
        className="rounded-md bg-[hsl(280,100%,70%)] px-4 py-2 text-lg font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
        disabled={!currentVersion || !upgradeVersion}
        onClick={() => goToDiff()}
      >
        Upgrade
      </button>
    </>
  );
};

const Home: NextPage = () => {
  const [loading, setLoading] = useState(true);
  const [versionOptions, setVersionOptions] = useState<VersionsGroupedByMajor>(
    []
  );

  useEffect(() => {
    const loadT3Versions = async () => {
      const t3Versions = await getT3VersionsGroupedByMajor();
      setVersionOptions(t3Versions);
      setLoading(false);
    };

    void loadT3Versions();
  }, []);

  return (
    <>
      <Head>
        <title>Upgrade T3 App</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c]">
        <div className="container flex grow flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-center text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
            Upgrade <span className="text-[hsl(280,100%,70%)]">T3</span> App
          </h1>

          <UpgradePanel loading={loading} versionOptions={versionOptions} />
        </div>
        <div className="pb-5">
          <a href="https://github.com/andreifilip123/t3-upgrade-web">
            <Image
              src="/github-mark-white.svg"
              alt="Github Logo"
              width={32}
              height={32}
            />
          </a>
        </div>
      </main>
    </>
  );
};

export default Home;
