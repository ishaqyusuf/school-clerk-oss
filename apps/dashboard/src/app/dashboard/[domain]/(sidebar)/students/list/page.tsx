import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";
import { Metadata } from "next";
import { SearchParams } from "nuqs";
import { loadStudentFilterParams } from "@/hooks/use-student-filter-params";

import { Suspense } from "react";
import { TableSkeleton } from "@/components/tables/skeleton";
import { DataTable } from "@/components/tables/students/data-table";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { StudentHeader } from "@/components/student-header";
import { StudentStatsCards } from "@/components/tables/students/student-stats-cards";

export const metadata: Metadata = {
  title: "Students",
};
type Props = {
  searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
  const searchParams = await props.searchParams;
  const filter = loadStudentFilterParams(searchParams);

  await batchPrefetch([
    trpc.students.index.infiniteQueryOptions({
      ...filter,
    }),
  ]);

  return (
    <HydrateClient>
      <PageTitle>Students</PageTitle>
      <div className="animate-in fade-in duration-500">
        <div className="py-6">
          <StudentHeader />
        </div>
        <StudentStatsCards />
        <div className="flex flex-col gap-6 mt-8">
          <ErrorBoundary errorComponent={ErrorFallback}>
            <Suspense fallback={<TableSkeleton />}>
              <DataTable grid />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </HydrateClient>
  );
}
