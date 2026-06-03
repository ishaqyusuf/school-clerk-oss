import { ErrorFallback } from "@/components/error-fallback";
import { FinanceTransfersTable } from "@/components/finance/finance-transfers-table";
import { DataTableSkeleton } from "@/components/tables/finance-transfers/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export async function FinanceTransfersPage() {
	const initialSettings = await getInitialTableSettings("financeTransfers");

	await batchPrefetch([trpc.finance.getInternalTransfers.queryOptions({})]);

	return (
		<HydrateClient>
			<div className="flex flex-col gap-6 p-6">
				<PageTitle>Internal Transfers</PageTitle>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<DataTableSkeleton />}>
						<FinanceTransfersTable initialSettings={initialSettings} />
					</Suspense>
				</ErrorBoundary>
			</div>
		</HydrateClient>
	);
}
