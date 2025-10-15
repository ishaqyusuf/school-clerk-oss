import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables/enrollments/table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadStudentFilterParams } from "@/hooks/use-student-filter-params";
import { batchPrefetch, trpc } from "@/trpc/server";
import { prisma } from "@school-clerk/db";
import { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { SearchParams } from "nuqs";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Enrollments | School Clerk",
};
type Props = {
  searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
  const searchParams = await props.searchParams;
  const filter = loadStudentFilterParams(searchParams);

  batchPrefetch([
    trpc.enrollments.index.queryOptions({
      ...(filter as any),
    }),
  ]);

  return (
    <div>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<TableSkeleton />}>
          <DataTable />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
