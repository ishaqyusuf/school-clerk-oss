import { FinanceSectionTabs } from "@/components/finance/finance-section-tabs";
import { FinanceChargesPage } from "@/components/finance/finance-charges-page";

export default async function Page() {
	return (
		<FinanceChargesPage
			title="Student Payments"
			subtitle="Student fees that have been paid in full."
			filter={{ payerType: "STUDENT", status: "PAID" }}
			tableTitle="Paid"
			tableDescription="Fully paid student charges."
			searchPlaceholder="Search students or fees"
			emptyTitle="No payments yet"
			emptyDescription="Student fees appear here once they are fully paid."
			emptyActionHref="/finance/student-payments"
			emptyActionLabel="Receive a payment"
		>
			<FinanceSectionTabs section="student-payments" />
		</FinanceChargesPage>
	);
}
