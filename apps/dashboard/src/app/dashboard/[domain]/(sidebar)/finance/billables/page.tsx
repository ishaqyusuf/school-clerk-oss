import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { BillablesTable } from "@/components/tables/billables";
import { ClassesSkeleton } from "@/components/tables/classrooms/skeleton";

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
        <Suspense fallback={<ClassesSkeleton />} key={loadingKey}>
          <BillablesTable query={searchQuery} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
