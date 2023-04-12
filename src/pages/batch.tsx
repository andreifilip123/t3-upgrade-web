import batchRequests from "@/lib/batchRequests";
import { type GetServerSideProps } from "next";
import { useRouter } from "next/router";

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const { batch } = query;
  await batchRequests(Number(batch));
  return {
    props: {},
  };
};

const BatchPage = () => {
  const router = useRouter();
  const { batch } = router.query;

  return (
    <div>
      <h1>Missing Diffs: {batch}</h1>
    </div>
  );
};

export default BatchPage;
