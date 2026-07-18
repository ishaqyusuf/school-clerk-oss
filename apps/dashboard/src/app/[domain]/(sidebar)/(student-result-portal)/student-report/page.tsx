import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { getStudentReportCookie } from "@/actions/cookies/student-report";
import { StudentReportView } from "./student-report-view";
import { resolveDashboardAcademicDataDirection } from "@/lib/academic-data-direction/server";
import { resolveReportDataDirection } from "@/lib/academic-data-direction/report-direction";

export default async function Page() {
  const [authCookie, studentReportCookie] = await Promise.all([
    getAuthCookie(),
    getStudentReportCookie(),
  ]);
  const academicDataDirection = authCookie.schoolId
    ? await resolveDashboardAcademicDataDirection(authCookie.schoolId)
    : null;

  return (
    <StudentReportView
      defaultTermId={authCookie.termId}
      defaultClassroomLayout={resolveReportDataDirection(
        studentReportCookie.classroomLayout,
        academicDataDirection?.direction,
      )}
    />
  );
}
