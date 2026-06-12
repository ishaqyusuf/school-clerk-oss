import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { TeacherReportSheet } from "@/components/teachers/teacher-report-sheet";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

export default async function Page() {
  const { termId } = await getAuthCookie();

  return (
    <div className="flex flex-col gap-6 py-8">
      <PageTitle>Report Cards</PageTitle>
      <TeacherReportSheet defaultTermId={termId ?? ""} />
    </div>
  );
}
