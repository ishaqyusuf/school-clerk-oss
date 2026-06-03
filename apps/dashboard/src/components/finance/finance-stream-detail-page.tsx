import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorFallback } from "@/components/error-fallback";
import { FinanceOverviewSkeleton } from "@/components/finance/finance-overview-skeleton";
import { FinanceStreamDetail } from "@/components/finance/finance-stream-detail";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

type FinanceStreamDetailPageProps = {
	streamId: string;
};

export async function FinanceStreamDetailPage({
	streamId,
}: FinanceStreamDetailPageProps) {
	await batchPrefetch([trpc.finance.getStreamDetails.queryOptions({ streamId })]);

	return (
		<HydrateClient>
			<div className="flex flex-col gap-6">
				<PageTitle>Account Stream</PageTitle>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<FinanceOverviewSkeleton />}>
						<FinanceStreamDetail streamId={streamId} />
					</Suspense>
				</ErrorBoundary>
			</div>
		</HydrateClient>
	);
}
