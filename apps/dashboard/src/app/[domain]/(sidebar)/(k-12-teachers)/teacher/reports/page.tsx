import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { getTeacherWorkspaceAction } from "@/actions/get-teacher-workspace";
import { TeacherReportSheet } from "@/components/teachers/teacher-report-sheet";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

export default async function Page() {
  const [{ termId }, workspace] = await Promise.all([
    getAuthCookie(),
    getTeacherWorkspaceAction(),
  ]);

  const defaultTermId = termId ?? "";
  const allowedClassroomIds = workspace.classrooms.map((c) => c.id);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle>Reports</PageTitle>
      <TeacherReportSheet
        defaultTermId={defaultTermId}
        allowedClassroomIds={allowedClassroomIds}
      />
    </div>
  );
}
