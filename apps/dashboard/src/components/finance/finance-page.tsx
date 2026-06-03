import { ErrorFallback } from "@/components/error-fallback";
import { FinanceOverview } from "@/components/finance/finance-overview";
import { FinanceOverviewSkeleton } from "@/components/finance/finance-overview-skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

type FinancePageProps = {
	title?: string;
};

export async function FinancePage({ title = "Finance" }: FinancePageProps) {
	const initialSettings = await getInitialTableSettings("financeStreams");

	await batchPrefetch([trpc.finance.overview.queryOptions()]);

	return (
		<HydrateClient>
			<div className="flex flex-col gap-6">
				<PageTitle>{title}</PageTitle>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<FinanceOverviewSkeleton />}>
						<FinanceOverview
							initialStreamSettings={initialSettings}
							title={title}
						/>
					</Suspense>
				</ErrorBoundary>
			</div>
		</HydrateClient>
	);
}
