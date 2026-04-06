import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";

import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

import { ProgressionClient } from "./progression-client";

interface PageProps {
  params: Promise<{ lastTerm: string; firstTerm: string }>;
}

export default async function Page({ params }: PageProps) {
  const { lastTerm, firstTerm } = await params;

  await batchPrefetch([
    trpc.academics.getPromotionClassrooms.queryOptions({
      lastTermId: lastTerm,
      firstTermId: firstTerm,
    }),
    trpc.classrooms.all.queryOptions({ sessionTermId: firstTerm }),
  ]);

  return (
    <div>
      <PageTitle>Student Progression</PageTitle>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<TableSkeleton />}>
          <ProgressionClient lastTermId={lastTerm} firstTermId={firstTerm} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
