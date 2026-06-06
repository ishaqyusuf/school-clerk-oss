import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorFallback } from "@/components/error-fallback";
import { FinanceTransactionsTable } from "@/components/finance/finance-transactions-table";
import { DataTableSkeleton } from "@/components/tables/finance-ledger/skeleton";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

export async function FinanceTransactionsPage({
	title = "Finance Transactions",
	subtitle,
}: {
	title?: string;
	subtitle?: string;
} = {}) {
	await batchPrefetch([trpc.finance.getLedgerEntries.queryOptions()]);

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
						<FinanceTransactionsTable />
					</Suspense>
				</ErrorBoundary>
			</div>
		</HydrateClient>
	);
}
