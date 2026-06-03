import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables/enrollments/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadStudentFilterParams } from "@/hooks/use-student-filter-params";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { buildTenantPageMetadata } from "@/utils/tenant-page-metadata";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export async function generateMetadata({ params }) {
	const { domain } = await params;
	return buildTenantPageMetadata({
		domain,
		pathname: "/students/enrollment",
	});
}
type Props = {
	searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = loadStudentFilterParams(searchParams);

	await batchPrefetch([
		trpc.enrollments.index.infiniteQueryOptions({
			...filter,
		}),
	]);

	return (
		<HydrateClient>
			<div className="flex flex-col gap-6">
				<PageTitle>Enrollment</PageTitle>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<TableSkeleton />}>
						<DataTable />
					</Suspense>
				</ErrorBoundary>
			</div>
		</HydrateClient>
	);
}
