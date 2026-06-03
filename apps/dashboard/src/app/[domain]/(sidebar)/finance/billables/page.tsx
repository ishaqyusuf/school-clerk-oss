import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables/billables/data-table";
import { ClassesSkeleton } from "@/components/tables/classrooms/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export default async function Page() {
	await batchPrefetch([trpc.finance.getBillables.queryOptions()]);

	return (
		<HydrateClient>
			<div className="flex flex-col gap-6">
				<PageTitle>Service Billables</PageTitle>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<ClassesSkeleton />}>
						<DataTable />
					</Suspense>
				</ErrorBoundary>
			</div>
		</HydrateClient>
	);
}
