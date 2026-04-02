import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { DataTable } from "@/components/tables/staffs/data-table";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

import { searchParamsCache } from "./search-params";

export default async function Page({ searchParams, params }) {
  const searchQuery = searchParamsCache.parse(await searchParams);
  const { search } = searchQuery;

  await batchPrefetch([
    trpc.staff.getStaffList.queryOptions(search ? { q: search } : undefined),
  ]);

  const loadingKey = JSON.stringify({
    search,
  });
  return (
    <HydrateClient>
      <div className="flex flex-col gap-6">
        <PageTitle>Teachers</PageTitle>
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<TableSkeleton />} key={loadingKey}>
            <DataTable search={search} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
