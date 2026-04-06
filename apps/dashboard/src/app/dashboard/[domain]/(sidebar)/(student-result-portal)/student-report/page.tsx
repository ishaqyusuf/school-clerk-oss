import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { getStudentReportCookie } from "@/actions/cookies/student-report";
import { StudentReportView } from "./student-report-view";

export default async function Page() {
  const [{ termId }, studentReportCookie] = await Promise.all([
    getAuthCookie(),
    getStudentReportCookie(),
  ]);

  return (
    <StudentReportView
      defaultTermId={termId}
      defaultClassroomLayout={studentReportCookie.classroomLayout ?? "ltr"}
    />
  );
}
