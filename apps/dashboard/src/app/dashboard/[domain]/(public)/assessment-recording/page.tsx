import { AssessmentRecording } from "@/components/assessment-recording";
import { constructMetadata } from "@/utils/construct-metadata";
import { getClassroomSubjects } from "@api/db/queries/subjects";
import { prisma } from "@school-clerk/db";

export async function generateMetadata({ searchParams }) {
  const departmentId = (await searchParams).deptId;
  const s = await getClassroomSubjects(prisma, {
    departmentId,
  });
  return constructMetadata({
    title: `${s?.departmentName}`,
  });
}
export default async function Page() {
  return <AssessmentRecording />;
}
