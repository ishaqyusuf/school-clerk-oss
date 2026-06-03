import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorFallback } from "@/components/error-fallback";
import { FinanceTransactionsTable } from "@/components/finance/finance-transactions-table";
import { DataTableSkeleton } from "@/components/tables/finance-ledger/skeleton";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

export async function FinanceTransactionsPage() {
	await batchPrefetch([trpc.finance.getLedgerEntries.queryOptions()]);

	return (
		<HydrateClient>
			<div className="flex flex-col gap-6 p-6">
				<PageTitle>Finance Transactions</PageTitle>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<DataTableSkeleton />}>
						<FinanceTransactionsTable />
					</Suspense>
				</ErrorBoundary>
			</div>
		</HydrateClient>
	);
}
