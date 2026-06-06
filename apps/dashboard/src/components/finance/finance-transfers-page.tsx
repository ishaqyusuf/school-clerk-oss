import { ErrorFallback } from "@/components/error-fallback";
import { FinanceTransfersTable } from "@/components/finance/finance-transfers-table";
import { DataTableSkeleton } from "@/components/tables/finance-transfers/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export async function FinanceTransfersPage({
	title = "Transfers",
	subtitle,
}: {
	title?: string;
	subtitle?: string;
} = {}) {
	const initialSettings = await getInitialTableSettings("financeTransfers");

	await batchPrefetch([trpc.finance.getInternalTransfers.queryOptions({})]);

	return (
		<HydrateClient>
			<div className="flex flex-col gap-6 p-6">
				<PageTitle>{title}</PageTitle>
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
						{subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
					</div>
				</div>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<DataTableSkeleton />}>
						<FinanceTransfersTable initialSettings={initialSettings} />
					</Suspense>
				</ErrorBoundary>
			</div>
		</HydrateClient>
	);
}
