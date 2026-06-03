import { ClassroomHeader } from "@/components/classroom-header";
import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables/classrooms/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadClassroomFilterParams } from "@/hooks/use-classroom-filter-params";
import { batchPrefetch, trpc } from "@/trpc/server";
import { buildTenantPageMetadata } from "@/utils/tenant-page-metadata";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export async function generateMetadata(props) {
	const { domain } = await props.params;
	return buildTenantPageMetadata({
		domain,
		pathname: "/academic/classes",
	});
}
type Props = {
	params: Promise<{ domain: string }>;
	searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = loadClassroomFilterParams(searchParams);
	await batchPrefetch([
		trpc.academics.getClassrooms.infiniteQueryOptions({
			...filter,
		}),
	]);
	return (
		<div className="py-4 space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<PageTitle>Classrooms</PageTitle>
					<p className="text-muted-foreground mt-1 text-sm">
						Manage class capacities, assigned teachers, and term records.
					</p>
				</div>
			</div>
			<ClassroomHeader />
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense fallback={<TableSkeleton />}>
					<DataTable />
				</Suspense>
			</ErrorBoundary>
		</div>
	);
}
