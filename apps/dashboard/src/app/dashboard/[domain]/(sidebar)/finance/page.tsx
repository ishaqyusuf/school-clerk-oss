import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { AccountingStreams } from "@/components/accounting-streams";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

export default async function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle>Finance</PageTitle>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<TableSkeleton />}>
          <AccountingStreams />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
