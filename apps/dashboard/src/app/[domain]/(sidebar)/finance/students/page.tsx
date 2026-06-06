import { FinanceChargesPage } from "@/components/finance/finance-charges-page";
import { ReceivePaymentAction } from "@/components/finance/finance-page-actions";

export default async function Page() {
	return (
		<FinanceChargesPage
			title="Student Balances"
			subtitle="Review student receivables and outstanding balances before collection."
			filter={{ payerType: "STUDENT" }}
			headerAction={<ReceivePaymentAction />}
			tableTitle="Student Receivables"
			tableDescription="Student charges and outstanding balances ready for collection."
			searchPlaceholder="Search students or balances"
			emptyTitle="No student balances"
			emptyDescription="Student balances will appear here after fee structures are assigned."
			emptyActionHref="/finance/setup/fees"
			emptyActionLabel="Set up fee structures"
		/>
	);
}
