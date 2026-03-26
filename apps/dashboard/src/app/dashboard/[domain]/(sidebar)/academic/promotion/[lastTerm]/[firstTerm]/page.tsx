import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { batchPrefetch, trpc } from "@/trpc/server";
import { TableSkeleton } from "@/components/tables/skeleton";
import { ErrorFallback } from "@/components/error-fallback";
import { PromotionClient } from "./promotion-client";

interface PageProps {
  params: Promise<{ lastTerm: string; firstTerm: string }>;
}

export default async function Page({ params }: PageProps) {
  const { lastTerm, firstTerm } = await params;
  await batchPrefetch([
    trpc.academics.getPromotionStudents.queryOptions({
      lastTermId: lastTerm,
      firstTermId: firstTerm,
    }),
    trpc.classrooms.getCurrentSessionClassroom.queryOptions(),
  ]);
  return (
    <div>
      <PageTitle>Student Promotion</PageTitle>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<TableSkeleton />}>
          <PromotionClient lastTermId={lastTerm} firstTermId={firstTerm} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
