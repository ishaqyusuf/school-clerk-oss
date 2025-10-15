import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { constructMetadata } from "@school-clerk/utils/construct-metadata";
import { DataTable } from "@/components/tables/classrooms/data-table";
import { ClassroomHeader } from "@/components/classroom-header";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadClassroomFilterParams } from "@/hooks/use-classroom-filter-params";
import { SearchParams } from "nuqs";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

export async function generateMetadata(props) {
  return constructMetadata({
    title: "Classroom | School Clerk",
  });
}
type Props = {
  searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
  const searchParams = await props.searchParams;
  const filter = loadClassroomFilterParams(searchParams);
  batchPrefetch([
    trpc.academics.getClassrooms.infiniteQueryOptions({
      ...filter,
    }),
  ]);
  return (
    <div className="py-4 space-y-8">
      <PageTitle>Classroom</PageTitle>
      <ClassroomHeader />
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<TableSkeleton />}>
          <DataTable />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
