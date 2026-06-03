import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { AccountStreamDetail } from "@/components/account-stream-detail";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

export default async function Page({
	params,
}: {
	params: Promise<{ streamId: string }>;
}) {
	const { streamId } = await params;

	await batchPrefetch([
		trpc.finance.getStreamDetails.queryOptions({ streamId }),
	]);

	return (
		<HydrateClient>
			<div className="flex flex-col gap-6">
				<PageTitle>Account Stream Detail</PageTitle>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<TableSkeleton />}>
						<AccountStreamDetail streamId={streamId} />
					</Suspense>
				</ErrorBoundary>
			</div>
		</HydrateClient>
	);
}
