"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";

import { EmptyState } from "./empty-states";
import { DataTable } from "./table";

const pageSize = 25;

export function PageTable() {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.finance.getTransactions.queryOptions());

  if (!data?.length) {
    return <EmptyState />;
  }

  return (
    <DataTable
      data={data}
      loadMore={async () => data}
      pageSize={pageSize}
      hasNextPage={false}
    />
  );
}
