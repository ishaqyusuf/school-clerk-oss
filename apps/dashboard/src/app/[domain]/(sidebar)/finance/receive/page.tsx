import { FinanceChargesPage } from "@/components/finance/finance-charges-page";
import { ReceivePaymentAction } from "@/components/finance/finance-page-actions";

export default async function Page() {
	return (
		<FinanceChargesPage
			title="Receive Student Payment"
			subtitle="Search for a student, review balances, and record a payment."
			filter={{ payerType: "STUDENT" }}
			headerAction={<ReceivePaymentAction />}
			tableTitle="Student Payment Queue"
			tableDescription="Outstanding student charges available for payment allocation."
			searchPlaceholder="Search students or charges"
			emptyTitle="No payable student balances"
			emptyDescription="Outstanding student charges will appear here when there is something to collect."
			emptyActionHref="/finance/setup/fees"
			emptyActionLabel="Set up fee structures"
		/>
	);
}
