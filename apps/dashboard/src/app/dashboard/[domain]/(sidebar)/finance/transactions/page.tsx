import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { ClassesSkeleton } from "@/components/tables/classrooms/skeleton";
import { PageTable } from "@/components/tables/transactions";

export default async function Page() {
  return (
    <div className="flex flex-col gap-6">
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<ClassesSkeleton />}>
          <PageTable />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
