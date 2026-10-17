import { ErrorFallback } from "@/components/error-fallback";
import { FinanceHome } from "@/components/finance/finance-home";
import { FinanceOverviewSkeleton } from "@/components/finance/finance-overview-skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export default async function Page() {
	await batchPrefetch([
		trpc.finance.getHomeSummary.queryOptions(),
		trpc.finance.getWorkspaceSummary.queryOptions({ period: "term" }),
	]);

	return (
		<HydrateClient>
			<PageTitle>Finance</PageTitle>
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense fallback={<FinanceOverviewSkeleton summaryCount={4} />}>
					<FinanceHome />
				</Suspense>
			</ErrorBoundary>
		</HydrateClient>
	);
}
