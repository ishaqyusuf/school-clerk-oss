import {
  batchPrefetch,
  getQueryClient,
  HydrateClient,
  trpc,
} from "@/trpc/server";
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
export const metadata: Metadata = {
  title: "Students",
};
type Props = {
  searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
  const queryClient = getQueryClient();
  const searchParams = await props.searchParams;
  const filter = loadStudentFilterParams(searchParams);

  batchPrefetch([
    trpc.students.index.infiniteQueryOptions({
      ...filter,
    }),
  ]);
  // Change this to prefetch once this is fixed: https://github.com/trpc/trpc/issues/6632
  // await queryClient.fetchInfiniteQuery(
  //   trpc.students.index.infiniteQueryOptions({
  //     ...filter,
  //   })
  // );
  // if (!data?.pages?.[0]?.data?.length) return <></>;

  return (
    <HydrateClient>
      <PageTitle>Students</PageTitle>
      <div className="py-6">
        <StudentHeader />
      </div>
      <div className="flex flex-col gap-6">
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<TableSkeleton />}>
            <DataTable grid />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
