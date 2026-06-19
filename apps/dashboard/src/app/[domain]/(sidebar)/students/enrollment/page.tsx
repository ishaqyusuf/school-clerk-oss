import { ErrorFallback } from "@/components/error-fallback";
import { EnrollmentManagementClient } from "@/components/enrollment/enrollment-management-client";
import { TableSkeleton } from "@/components/tables/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { buildTenantPageMetadata } from "@/utils/tenant-page-metadata";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export async function generateMetadata({ params }) {
	const { domain } = await params;
	return buildTenantPageMetadata({
		domain,
		pathname: "/students/enrollment",
	});
}
export default async function Page() {
	await batchPrefetch([
		trpc.enrollmentLinks.listLinks.queryOptions(),
		trpc.enrollmentLinks.getApplications.queryOptions({}),
		trpc.classrooms.getCurrentSessionClassroom.queryOptions(),
	]);

	return (
		<HydrateClient>
			<div className="flex flex-col gap-6">
				<PageTitle>Enrollment</PageTitle>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<TableSkeleton />}>
						<EnrollmentManagementClient />
					</Suspense>
				</ErrorBoundary>
			</div>
		</HydrateClient>
	);
}
