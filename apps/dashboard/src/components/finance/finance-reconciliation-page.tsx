import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorFallback } from "@/components/error-fallback";
import { FinanceOverviewSkeleton } from "@/components/finance/finance-overview-skeleton";
import { FinanceReconciliationView } from "@/components/finance/finance-reconciliation-view";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

export async function FinanceReconciliationPage() {
	await batchPrefetch([
		trpc.finance.getFinanceIntegrityReport.queryOptions({}),
		trpc.finance.getFinanceReports.queryOptions({}),
	]);

	return (
		<HydrateClient>
			<div className="flex flex-col gap-6">
				<PageTitle>Finance Reconciliation</PageTitle>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<FinanceOverviewSkeleton />}>
						<FinanceReconciliationView />
					</Suspense>
				</ErrorBoundary>
			</div>
		</HydrateClient>
	);
}
