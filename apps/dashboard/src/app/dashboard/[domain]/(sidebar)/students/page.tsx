import { ErrorFallback } from "@/components/error-fallback";

import { TableSkeleton } from "@/components/tables/skeleton";
import { DataTable } from "@/components/tables/students/data-table";
import { batchPrefetch, trpc } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export default async function Page() {
  await batchPrefetch([trpc.students.index.infiniteQueryOptions({})]);
  return (
    <div className="flex flex-col gap-6">
      {/* <StudentHeader /> */}
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<TableSkeleton />}>
          <DataTable grid />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
