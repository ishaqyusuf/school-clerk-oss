import { FinanceSectionTabs } from "@/components/finance/finance-section-tabs";
import { FinanceChargesPage } from "@/components/finance/finance-charges-page";
import { ReceivePaymentAction } from "@/components/finance/finance-page-actions";

export default async function Page() {
	return (
		<FinanceChargesPage
			title="Student Payments"
			subtitle="Fees, uniforms and books paid by students. Pick a student to receive a payment."
			filter={{ payerType: "STUDENT", unpaidOnly: true }}
			headerAction={<ReceivePaymentAction />}
			tableTitle="Waiting for payment"
			tableDescription="Student charges with money still to collect."
			searchPlaceholder="Search students or fees"
			emptyTitle="Nothing to collect"
			emptyDescription="Student charges with money still owed will appear here."
			emptyActionHref="/finance/settings/fees"
			emptyActionLabel="Set up what students pay"
		>
			<FinanceSectionTabs section="student-payments" />
		</FinanceChargesPage>
	);
}
