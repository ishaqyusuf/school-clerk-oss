import { ErrorFallback } from "@/components/error-fallback";
import { StudentHeader } from "@/components/student-header";
import { DataTable } from "@/components/tables/students/data-table";
import { StudentsSkeleton } from "@/components/tables/students/skeleton";
import { batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export default async function Page() {
	await batchPrefetch([trpc.students.index.infiniteQueryOptions({})]);

	return (
		<div className="flex flex-col gap-6">
			<PageTitle>Students</PageTitle>
			<StudentHeader />
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense fallback={<StudentsSkeleton />}>
					<DataTable grid />
				</Suspense>
			</ErrorBoundary>
		</div>
	);
}
