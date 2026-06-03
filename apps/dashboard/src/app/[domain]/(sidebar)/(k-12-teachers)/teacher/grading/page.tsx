import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { TeacherGradingPanel } from "@/components/teachers/workspace-pages";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

export default function Page() {
	return (
		<div className="flex flex-col gap-6">
			<PageTitle>Grading</PageTitle>
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense fallback={<TableSkeleton />}>
					<TeacherGradingPanel />
				</Suspense>
			</ErrorBoundary>
		</div>
	);
}
