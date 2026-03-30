import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { StudentPaymentPortal } from "@/components/student-payment-portal";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle>Student Payment Portal</PageTitle>
      <StudentPaymentPortal />
    </div>
  );
}
