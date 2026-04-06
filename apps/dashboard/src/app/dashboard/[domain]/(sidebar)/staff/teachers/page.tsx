import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { DataTable } from "@/components/tables/staffs/data-table";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

import { searchParamsCache } from "./search-params";

export default async function Page({ searchParams, params }) {
	const searchQuery = searchParamsCache.parse(await searchParams);
	const { search, status } = searchQuery;

	await batchPrefetch([
		trpc.staff.getStaffList.queryOptions({
			...(search ? { q: search } : {}),
			...(status
				? { status: status as "all" | "pending" | "active" | "failed" }
				: {}),
		}),
	]);

	const loadingKey = JSON.stringify({
		search,
		status,
	});
	return (
		<HydrateClient>
			<div className="flex flex-col gap-6">
				<PageTitle>Staff management</PageTitle>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<TableSkeleton />} key={loadingKey}>
						<DataTable search={search} status={status} />
					</Suspense>
				</ErrorBoundary>
			</div>
		</HydrateClient>
	);
}
