import batchRequests from "@/lib/batchRequests";
import { type GetServerSideProps, type NextPage } from "next";
import { useRouter } from "next/router";

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const { missingDiffs, diffs } = await batchRequests(Number(params?.count));

  console.log(missingDiffs, diffs);

  return {
    props: {
      missingDiffs,
    },
  };
};

interface BatchPageProps {
  missingDiffs: string[];
}

const BatchPage: NextPage<BatchPageProps> = ({ missingDiffs }) => {
  const { query } = useRouter();
  const { count } = query;

  return (
    <div>
      <h1>Generated {count} diffs</h1>

      {missingDiffs.length > 0 && (
        <div>
          <h2>Generated:</h2>
          <ul>
            {missingDiffs.map((missingDiff) => (
              <li key={missingDiff}>{missingDiff}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BatchPage;
