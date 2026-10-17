import { FinanceSectionTabs } from "@/components/finance/finance-section-tabs";
import { FinanceChargesPage } from "@/components/finance/finance-charges-page";
import { ReceivePaymentAction } from "@/components/finance/finance-page-actions";
import { PaymentImportAction } from "@/components/finance/payment-import-action";

export default async function Page() {
	return (
		<FinanceChargesPage
			title="Student Payments"
			subtitle="Every student fee with its balance, paid or not."
			filter={{ payerType: "STUDENT" }}
			headerAction={
				<div className="flex flex-wrap gap-2">
					<PaymentImportAction mode="STUDENT" />
					<ReceivePaymentAction />
				</div>
			}
			tableTitle="Who owes"
			tableDescription="Student charges and what is still outstanding."
			searchPlaceholder="Search students or balances"
			emptyTitle="No student fees yet"
			emptyDescription="Student balances will appear here after fees are assigned."
			emptyActionHref="/finance/settings/fees"
			emptyActionLabel="Set up what students pay"
		>
			<FinanceSectionTabs section="student-payments" />
		</FinanceChargesPage>
	);
}
