import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { TeacherStudentsPanel } from "@/components/teachers/workspace-pages";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const params = await searchParams;
	const search =
		typeof params.search === "string" ? params.search.trim() : undefined;

	return (
		<div className="flex flex-col gap-6">
			<PageTitle>My Students</PageTitle>
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense fallback={<TableSkeleton />}>
					<TeacherStudentsPanel search={search} />
				</Suspense>
			</ErrorBoundary>
		</div>
	);
}
