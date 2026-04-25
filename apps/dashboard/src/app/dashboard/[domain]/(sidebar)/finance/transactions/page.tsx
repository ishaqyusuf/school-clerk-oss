import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { DataTable } from "@/components/tables/transactions/data-table";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";
import { prisma } from "@school-clerk/db";

export default async function Page() {
  await batchPrefetch([trpc.finance.getTransactions.queryOptions()]);
  const s = await prisma.user.findMany({});
  console.log(s);

  await prisma.user.updateMany({
    where: {
      email: "ishaqyusuf024@gmail.com",
      // name: "Ishaq",
    },
    data: {
      role: "Admin",
    },
  });
  return (
    <HydrateClient>
      <div className="flex flex-col gap-6">
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<TableSkeleton />}>
            <DataTable />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
