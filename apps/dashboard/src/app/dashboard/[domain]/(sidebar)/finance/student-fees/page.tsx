import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { DataSkeleton } from "@/components/data-skeleton";
import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables/student-fees/data-table";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

export default async function Page() {
  await batchPrefetch([trpc.transactions.getStudentFees.queryOptions()]);

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6">
        <PageTitle>Student Fees</PageTitle>
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<DataSkeleton />}>
            <DataTable />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
