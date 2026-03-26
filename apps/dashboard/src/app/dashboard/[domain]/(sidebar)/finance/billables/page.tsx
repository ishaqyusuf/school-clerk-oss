import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { BillablesTable } from "@/components/tables/billables";
import { ClassesSkeleton } from "@/components/tables/classrooms/skeleton";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

export default async function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle>Billables</PageTitle>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<ClassesSkeleton />}>
          <BillablesTable />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
