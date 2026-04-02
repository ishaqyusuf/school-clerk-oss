import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables/billables/data-table";
import { ClassesSkeleton } from "@/components/tables/classrooms/skeleton";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

export default async function Page() {
  await batchPrefetch([trpc.finance.getBillables.queryOptions()]);

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6">
        <PageTitle>Billables</PageTitle>
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<ClassesSkeleton />}>
            <DataTable />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
