import { ErrorFallback } from "@/components/error-fallback";
import { SubjectHeader } from "@/components/subject-header";
import { TableSkeleton } from "@/components/tables/skeleton";
import { DataTable } from "@/components/tables/subjects/data-table";
import { loadSubjectFilterParams } from "@/hooks/use-subject-filter-params";
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
		pathname: "/academic/subjects",
	});
}
type Props = {
	params: Promise<{ domain: string }>;
	searchParams: Promise<SearchParams>;
};
export default async function Page(props) {
	const searchParams = await props.searchParams;
	const filter = loadSubjectFilterParams(searchParams);
	await batchPrefetch([
		trpc.subjects.getSubjects.infiniteQueryOptions({
			...filter,
		}),
	]);
	return (
		<div>
			<PageTitle>Subject</PageTitle>
			<SubjectHeader />
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense fallback={<TableSkeleton />}>
					<DataTable />
				</Suspense>
			</ErrorBoundary>
		</div>
	);
}
