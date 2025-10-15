import { getBills } from "@/actions/get-bills";
import { getStudentFees } from "@/actions/get-student-fees";

import { EmptyState, NoResults } from "./empty-states";
import { DataTable } from "./table";

type Props = {
  query?;
};

const pageSize = 25;

export async function PageTable({ query }: Props) {
  const { start, end, statuses, customers, sort, page } = query;
  const filter = {
    start,
    end,
    statuses,
    customers,
  };

  async function loadMore({ from, to }: { from: number; to: number }) {
    "use server";
    return getBills({
      sort,
    });
  }

  const { data, meta } = await getBills({});

  const hasNextPage = Boolean(
    meta?.count && meta.count / (page + 1) > pageSize,
  );

  if (!data?.length) {
    if (
      query?.length ||
      Object.values(filter).some((value) => value !== null)
    ) {
      return <NoResults />;
    }

    return <EmptyState />;
  }
  return (
    <DataTable
      data={data}
      loadMore={loadMore}
      pageSize={pageSize}
      hasNextPage={hasNextPage}
      // page={page}
    />
  );
}
