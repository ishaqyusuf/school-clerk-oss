import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { StudentReportView } from "./student-report-view";

export default async function Page() {
  const { termId } = await getAuthCookie();
  return <StudentReportView defaultTermId={termId} />;
}
