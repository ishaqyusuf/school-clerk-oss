import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { ServicePayments } from "@/components/service-payments";

export default async function Page() {
  return (
    <HydrateClient>
      <div className="flex flex-col gap-4">
        <PageTitle>Service Payments</PageTitle>
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<TableSkeleton />}>
            <ServicePayments />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
