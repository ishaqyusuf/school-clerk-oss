import { AssessmentRecording } from "@/components/assessment-recording";
import { buildTenantPageMetadata } from "@/utils/tenant-page-metadata";
import { prisma } from "@school-clerk/db";

export async function generateMetadata({ params, searchParams }) {
	const { domain } = await params;
	const departmentId = (await searchParams).deptId;
	const subjectId = (await searchParams).deptSubjectId;
	const s = await prisma.classRoomDepartment.findUnique({
		where: {
			id: departmentId,
		},
		select: {
			departmentName: true,

			subjects: {
				take: 1,
				select: {
					// description: true,
					subject: {
						select: {
							title: true,
							// description: true,
						},
					},
				},
				where: {
					id: subjectId,
				},
			},
		},
	});
	return buildTenantPageMetadata({
		domain,
		pathname: "/assessment-recording",
		title:
			[s?.subjects[0]?.subject.title, s?.departmentName]
				.filter(Boolean)
				.join(" • ") || "Assessment Recording",
		description:
			s?.subjects[0]?.subject.title && s?.departmentName
				? `Record assessments for ${s.subjects[0].subject.title} in ${s.departmentName}.`
				: "Record assessments and manage subject score entry.",
		noIndex: true,
	});
}
export default async function Page() {
	return <AssessmentRecording />;
}
