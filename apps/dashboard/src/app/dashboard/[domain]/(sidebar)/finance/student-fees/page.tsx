import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { DataSkeleton } from "@/components/data-skeleton";
import { ErrorFallback } from "@/components/error-fallback";
import { PageTable } from "@/components/tables/student-fees";

import { searchParamsCache } from "./search-params";

export default async function Page({ searchParams, params }) {
  const searchQuery = searchParamsCache.parse(await searchParams);
  const { q: query, sort, start, end, statuses, customers, page } = searchQuery;

  const loadingKey = JSON.stringify({
    q: query,
    sort,
    start,
    end,
    statuses,
    customers,
    page,
  });
  return (
    <div className="flex flex-col gap-6">
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<DataSkeleton />} key={loadingKey}>
          <PageTable query={searchQuery} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
