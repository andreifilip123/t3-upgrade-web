// Import your Client Component
import { getT3VersionsGroupedByMajor } from "@/lib/utils";
import UpgradePanel from "./upgrade-panel";

export default async function Page() {
  const t3Versions = await getT3VersionsGroupedByMajor();

  return <UpgradePanel versionOptions={t3Versions} />;
}
