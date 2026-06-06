import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorFallback } from "@/components/error-fallback";
import { FinanceOverviewSkeleton } from "@/components/finance/finance-overview-skeleton";
import { FinanceReconciliationView } from "@/components/finance/finance-reconciliation-view";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

export async function FinanceReconciliationPage({
	title = "Finance Reconciliation",
	subtitle,
}: {
	title?: string;
	subtitle?: string;
} = {}) {
	await batchPrefetch([
		trpc.finance.getFinanceIntegrityReport.queryOptions({}),
		trpc.finance.getFinanceReports.queryOptions({}),
	]);

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
					<Suspense fallback={<FinanceOverviewSkeleton />}>
						<FinanceReconciliationView />
					</Suspense>
				</ErrorBoundary>
			</div>
		</HydrateClient>
	);
}
