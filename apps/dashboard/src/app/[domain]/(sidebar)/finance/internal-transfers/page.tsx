import { ErrorFallback } from "@/components/error-fallback";
import { InternalTransfersManager } from "@/components/internal-transfers-manager";
import { TableSkeleton } from "@/components/tables/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export default async function Page() {
	await batchPrefetch([trpc.finance.getInternalTransfers.queryOptions({})]);

	return (
		<HydrateClient>
			<div className="flex flex-col gap-6">
				<PageTitle>Internal Transfers</PageTitle>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<TableSkeleton />}>
						<InternalTransfersManager />
					</Suspense>
				</ErrorBoundary>
			</div>
		</HydrateClient>
	);
}
