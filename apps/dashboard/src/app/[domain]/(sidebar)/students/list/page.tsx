import { loadStudentFilterParams } from "@/hooks/use-student-filter-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { buildTenantPageMetadata } from "@/utils/tenant-page-metadata";
import type { SearchParams } from "nuqs";

import { ErrorFallback } from "@/components/error-fallback";
import { StudentHeader } from "@/components/student-header";
import { PromotionCta } from "@/components/students/promotion-cta";
import { StudentDuplicateAlert } from "@/components/students/student-duplicate-alert";
import { DataTable } from "@/components/tables/students/data-table";
import { StudentsSkeleton } from "@/components/tables/students/skeleton";
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
	const { sort } = loadSortParams(searchParams);
	const normalizedSort =
		sort?.length === 2 &&
		["studentName", "gender", "dob", "createdAt"].includes(sort[0] ?? "") &&
		["asc", "desc"].includes(sort[1] ?? "")
			? (sort as [
					"studentName" | "gender" | "dob" | "createdAt",
					"asc" | "desc",
				])
			: null;
	const initialSettings = await getInitialTableSettings("students");

	await batchPrefetch([
		trpc.students.index.infiniteQueryOptions({
			...filter,
			sort: normalizedSort,
		}),
		trpc.students.analytics.queryOptions({}),
		trpc.academics.dashboard.queryOptions({}),
		trpc.students.filters.queryOptions(),
	]);

	return (
		<HydrateClient>
			<PageTitle>Students</PageTitle>
			<div className="flex animate-in flex-col gap-6 py-6 fade-in duration-500">
				<StudentStatsCards />
				<StudentHeader />
				<PromotionCta />
				<div>
					<StudentDuplicateAlert
						classroomDepartmentId={filter.departmentId}
						sessionTermId={filter.sessionTermId}
						showCount
					/>
				</div>
				<div className="flex flex-col gap-6">
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense
							fallback={<StudentsSkeleton initialSettings={initialSettings} />}
						>
							<DataTable initialSettings={initialSettings} />
						</Suspense>
					</ErrorBoundary>
				</div>
			</div>
		</HydrateClient>
	);
}
