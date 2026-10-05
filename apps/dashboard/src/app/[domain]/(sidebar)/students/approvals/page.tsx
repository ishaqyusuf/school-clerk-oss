import { ClassStudentApprovals } from "@/components/students/class-student-approvals";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

export default function Page() {
  return <div className="flex flex-col gap-6 py-6"><PageTitle>Student approvals</PageTitle><ClassStudentApprovals /></div>;
}
