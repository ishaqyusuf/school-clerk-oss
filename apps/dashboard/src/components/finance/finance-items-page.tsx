import { ErrorFallback } from "@/components/error-fallback";
import { FinanceItemsTable } from "@/components/finance/finance-items-table";
import { DataTableSkeleton } from "@/components/tables/finance-items/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

type FinanceItemsPageProps = {
	filter?: { type?: string; excludeType?: string };
};

export async function FinanceItemsPage({ filter = {} }: FinanceItemsPageProps = {}) {
	const initialSettings = await getInitialTableSettings("financeItems");

	await batchPrefetch([trpc.finance.getItems.queryOptions(filter)]);

	return (
		<HydrateClient>
			<div className="flex flex-col gap-6 p-6">
				<PageTitle>Finance Items</PageTitle>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<DataTableSkeleton />}>
						<FinanceItemsTable initialSettings={initialSettings} filter={filter} />
					</Suspense>
				</ErrorBoundary>
			</div>
		</HydrateClient>
	);
}
