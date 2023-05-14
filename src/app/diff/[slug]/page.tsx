import { getDiffPath } from "@/lib/fileUtils";
import { extractVersionsAndFeatures } from "@/lib/utils";
import { promises as fs } from "fs";
import { notFound, useParams } from "next/navigation";
import DiffPage from "./diff-page";

export default async function Page() {
  const params = useParams();

  if (!params?.slug) {
    console.warn("No slug provided");
    notFound();
  }

  const versionsAndFeatures = extractVersionsAndFeatures(params.slug);

  if (!versionsAndFeatures) {
    console.warn("No versions and features provided");
    notFound();
  }

  const diffPath = getDiffPath(versionsAndFeatures);
  const fileExists = await fs
    .access(diffPath, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);

  if (fileExists) {
    const differences = await fs.readFile(diffPath, "utf8");

    return (
      <DiffPage
        diffText={differences}
        versionsAndFeatures={versionsAndFeatures}
      />
    );
  }

  console.warn("No diff found");
  notFound();
}
