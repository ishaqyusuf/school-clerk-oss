import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { TeacherDashboardPanel } from "@/components/teachers/workspace-pages";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

export default function Page() {
	return (
		<div className="flex flex-col gap-6">
			<PageTitle>Teacher Workspace</PageTitle>
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense fallback={<TableSkeleton />}>
					<TeacherDashboardPanel />
				</Suspense>
			</ErrorBoundary>
		</div>
	);
}
