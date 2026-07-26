import { ErrorFallback } from "@/components/error-fallback";
import { SubjectHeader } from "@/components/subject-header";
import { TableSkeleton } from "@/components/tables/skeleton";
import { SubjectCatalogDataTable } from "@/components/tables/subjects/catalog-data-table";
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
		trpc.subjects.getSubjectCatalog.infiniteQueryOptions({
			...filter,
		}),
	]);
	return (
		<div className="space-y-6 py-4">
			<div>
				<PageTitle>Subjects</PageTitle>
				<p className="mt-1 text-sm text-muted-foreground">
					Manage the subject catalog and see how many classes use each subject.
				</p>
			</div>
			<SubjectHeader />
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense fallback={<TableSkeleton />}>
					<SubjectCatalogDataTable />
				</Suspense>
			</ErrorBoundary>
		</div>
	);
}
