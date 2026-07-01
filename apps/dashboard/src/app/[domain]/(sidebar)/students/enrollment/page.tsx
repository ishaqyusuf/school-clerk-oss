import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { ErrorFallback } from "@/components/error-fallback";
import { EnrollmentManagementClient } from "@/components/enrollment/enrollment-management-client";
import { TableSkeleton } from "@/components/tables/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { buildTenantPageMetadata } from "@/utils/tenant-page-metadata";
import { prisma } from "@school-clerk/db";
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
	const cookie = await getAuthCookie();
	await batchPrefetch([
		trpc.enrollmentLinks.listLinks.queryOptions(),
		trpc.enrollmentLinks.getApplications.queryOptions({}),
		trpc.classrooms.getCurrentSessionClassroom.queryOptions(),
	]);
	const customAdmissionLetterTemplates = cookie?.schoolId
		? await (prisma as any).customDocumentTemplateRequest.findMany({
				where: {
					builtTemplateId: { not: null },
					deletedAt: null,
					documentType: "ADMISSION_LETTER",
					schoolProfileId: cookie.schoolId,
					status: "READY",
				},
				select: {
					builtTemplateJson: true,
					builtTemplateId: true,
					title: true,
				},
				orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
			})
		: [];

	return (
		<HydrateClient>
			<div className="flex flex-col gap-6">
				<PageTitle>Enrollment</PageTitle>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<TableSkeleton />}>
						<EnrollmentManagementClient
							admissionLetterTemplates={customAdmissionLetterTemplates
								.filter((template: any) => template.builtTemplateJson)
								.map((template: any) => ({
									id: template.builtTemplateId,
									label: template.title,
								}))}
						/>
					</Suspense>
				</ErrorBoundary>
			</div>
		</HydrateClient>
	);
}
