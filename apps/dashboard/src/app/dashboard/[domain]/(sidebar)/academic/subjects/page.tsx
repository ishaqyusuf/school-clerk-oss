import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { constructMetadata } from "@/utils/construct-metadata";
import { DataTable } from "@/components/tables/subjects/data-table";
import { SubjectHeader } from "@/components/subject-header";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadSubjectFilterParams } from "@/hooks/use-subject-filter-params";
import { SearchParams } from "nuqs";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

export async function generateMetadata(props) {
  return constructMetadata({
    title: "Subject | GND",
  });
}
type Props = {
  searchParams: Promise<SearchParams>;
};
export default async function Page(props) {
  const searchParams = await props.searchParams;
  const filter = loadSubjectFilterParams(searchParams);
  batchPrefetch([
    trpc.subjects.getSubjects.infiniteQueryOptions({
      ...filter,
    }),
  ]);
  return (
    <div>
      <PageTitle>Subject</PageTitle>
      <SubjectHeader />
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<TableSkeleton />}>
          <DataTable />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
