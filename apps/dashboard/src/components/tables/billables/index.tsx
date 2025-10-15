import { getBillables } from "@/actions/get-billables";

import { EmptyState, NoResults } from "./empty-states";
import { DataTable } from "./table";

type Props = {
  //   page: number;
  //   query?: string | null;
  //   sort?: string[] | null;
  //   start?: string | null;
  //   end?: string | null;
  //   statuses?: string[] | null;
  //   customers?: string[] | null;
  query?;
};

const pageSize = 25;

export async function BillablesTable({
  query,
  //   sort,
  //   start,
  //   end,
  //   statuses,
  //   customers,
  //   page,
}: Props) {
  const { start, end, statuses, customers, sort, page } = query;
  const filter = {
    start,
    end,
    statuses,
    customers,
  };

  async function loadMore({ from, to }: { from: number; to: number }) {
    "use server";

    return getBillables({
      // start
      // to,
      // from: from + 1,
      // searchQuery: query,
      sort,
      // filter,
    });
  }

  const { data, meta } = await getBillables({
    // searchQuery: query,
    // sort,
    // filter,
    // to: pageSize,
  });

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
