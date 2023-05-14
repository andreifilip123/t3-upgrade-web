import { useParams } from "next/navigation";

import batchRequests from "@/lib/batchRequests";
import BatchPage from "./batch-page";

export default async function Page() {
  const params = useParams();
  const startTime = performance.now();
  const { missingDiffs } = await batchRequests(Number(params?.count));
  const endTime = performance.now();

  return (
    <BatchPage missingDiffs={missingDiffs} duration={endTime - startTime} />
  );
}
