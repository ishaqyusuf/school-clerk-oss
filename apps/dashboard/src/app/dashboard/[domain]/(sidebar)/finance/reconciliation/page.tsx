import { ErrorFallback } from "@/components/error-fallback";
import { FinanceReconciliation } from "@/components/finance-reconciliation";
import { TableSkeleton } from "@/components/tables/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export default async function Page() {
  await batchPrefetch([
    trpc.finance.getFinanceIntegrityReport.queryOptions({}),
    trpc.finance.getFinanceReports.queryOptions({}),
  ]);

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6">
        <PageTitle>Finance Reconciliation</PageTitle>
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<TableSkeleton />}>
            <FinanceReconciliation />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
