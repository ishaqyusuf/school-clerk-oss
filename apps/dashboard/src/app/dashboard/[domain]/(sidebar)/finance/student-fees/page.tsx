import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { DataSkeleton } from "@/components/data-skeleton";
import { ErrorFallback } from "@/components/error-fallback";
import { PageTable } from "@/components/tables/student-fees";

export default async function Page() {
  return (
    <div className="flex flex-col gap-6">
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<DataSkeleton />}>
          <PageTable />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
