import { ErrorFallback } from "@/components/error-fallback";
import { ParentOverviewClient } from "@/components/parents/parent-overview-client";
import { TableSkeleton } from "@/components/tables/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { buildTenantPageMetadata } from "@/utils/tenant-page-metadata";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export async function generateMetadata({ params }) {
  const { domain } = await params;
  return buildTenantPageMetadata({
    domain,
    pathname: "/parents",
  });
}

export default async function Page() {
  await batchPrefetch([trpc.parents.overview.queryOptions()]);

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6">
        <PageTitle>Parent Portal</PageTitle>
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<TableSkeleton />}>
            <ParentOverviewClient />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
