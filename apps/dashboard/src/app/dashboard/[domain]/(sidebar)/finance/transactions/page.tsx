import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { DataTable } from "@/components/tables/transactions/data-table";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

export default async function Page() {
  await batchPrefetch([trpc.finance.getTransactions.queryOptions()]);

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6">
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<TableSkeleton />}>
            <DataTable />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
