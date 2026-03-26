import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { ClassesSkeleton } from "@/components/tables/classrooms/skeleton";
import { Table } from "@/components/tables/fees-management";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

export default async function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle>Fee Management</PageTitle>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<ClassesSkeleton />}>
          <Table />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
