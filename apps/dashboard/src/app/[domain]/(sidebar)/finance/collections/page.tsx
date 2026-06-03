import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { CollectionsDashboard } from "@/components/collections/collections-dashboard";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

export default async function Page() {
  await batchPrefetch([trpc.finance.getCollectionSummary.queryOptions({})]);

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6">
        <PageTitle>Fee Collections</PageTitle>
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<TableSkeleton />}>
            <CollectionsDashboard />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
