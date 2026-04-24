import { loadStudentFilterParams } from "@/hooks/use-student-filter-params";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { buildTenantPageMetadata } from "@/utils/tenant-page-metadata";
import type { SearchParams } from "nuqs";

import { ErrorFallback } from "@/components/error-fallback";
import { StudentHeader } from "@/components/student-header";
import { PromotionCta } from "@/components/students/promotion-cta";
import { TableSkeleton } from "@/components/tables/skeleton";
import { DataTable } from "@/components/tables/students/data-table";
import { StudentStatsCards } from "@/components/tables/students/student-stats-cards";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export async function generateMetadata({ params }) {
	const { domain } = await params;
	return buildTenantPageMetadata({
		domain,
		pathname: "/students/list",
	});
}
type Props = {
	searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = loadStudentFilterParams(searchParams);

	await batchPrefetch([
		trpc.students.index.infiniteQueryOptions({
			...filter,
		}),
		trpc.students.analytics.queryOptions({}),
		trpc.academics.dashboard.queryOptions({}),
	]);

	return (
		<HydrateClient>
			<PageTitle>Students</PageTitle>
			<div className="animate-in fade-in duration-500">
				<div className="py-6">
					<StudentHeader />
				</div>
				<PromotionCta />
				<StudentStatsCards />
				<div className="flex flex-col gap-6 mt-8">
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<TableSkeleton />}>
							<DataTable grid />
						</Suspense>
					</ErrorBoundary>
				</div>
			</div>
		</HydrateClient>
	);
}
