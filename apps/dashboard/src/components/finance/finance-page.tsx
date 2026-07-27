import { ErrorFallback } from "@/components/error-fallback";
import { FinanceWorkspace } from "@/components/finance/finance-workspace";
import { FinanceOverviewSkeleton } from "@/components/finance/finance-overview-skeleton";
import { loadFinanceWorkspaceParams } from "@/hooks/use-finance-workspace-params";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

type FinancePageProps = {
	searchParams?: Record<string, string | string[] | undefined>;
};

export async function FinancePage({ searchParams = {} }: FinancePageProps) {
	const filter = loadFinanceWorkspaceParams(searchParams);
	const queryInput = {
		period: filter.period,
		q: filter.q,
		accountTypes: filter.accountTypes ?? [],
		health: filter.health ?? [],
		sortField: filter.sortField,
		sortDirection: filter.sortDirection,
	};

	await batchPrefetch([
		trpc.finance.getWorkspaceSummary.queryOptions({ period: filter.period }),
		trpc.finance.getAccounts.infiniteQueryOptions(queryInput),
	]);

	return (
		<HydrateClient>
			<div className="flex flex-col gap-6">
				<PageTitle>Finance</PageTitle>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<FinanceOverviewSkeleton />}>
						<FinanceWorkspace />
					</Suspense>
				</ErrorBoundary>
			</div>
		</HydrateClient>
	);
}
