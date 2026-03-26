import { AssessmentRecording } from "@/components/assessment-recording";
import { constructMetadata } from "@/utils/construct-metadata";
import { getClassroomSubjects } from "@api/db/queries/subjects";
import { prisma } from "@school-clerk/db";

export async function generateMetadata({ searchParams }) {
  const departmentId = (await searchParams).deptId;
  const subjectId = (await searchParams).deptSubjectId;
  // const s = await getClassroomSubjects(prisma, {
  //   departmentId,
  // });
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
  return constructMetadata({
    title: `${s?.departmentName} - ${s?.subjects[0]?.subject.title}`,
    description: `${s?.subjects[0]?.subject.title}`,
  });
}
export default async function Page() {
  return <AssessmentRecording />;
}
