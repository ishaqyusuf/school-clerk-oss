import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { Table } from "@/components/tables/staffs";

import { searchParamsCache } from "./search-params";

export default async function Page({ searchParams, params }) {
  const searchQuery = searchParamsCache.parse(await searchParams);
  const { search } = searchQuery;

  const loadingKey = JSON.stringify({
    search,
  });
  return (
    <div className="flex flex-col gap-6">
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<TableSkeleton />} key={loadingKey}>
          <Table query={searchQuery} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
