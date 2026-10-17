import { FinanceSectionTabs } from "@/components/finance/finance-section-tabs";
import { FinanceChargesPage } from "@/components/finance/finance-charges-page";
import {
	CreateSalariesAction,
	PaySalariesAction,
} from "@/components/finance/finance-page-actions";
import { PaymentImportAction } from "@/components/finance/payment-import-action";

export default async function Page() {
	return (
		<FinanceChargesPage
			title="Salaries"
			subtitle="Pay teachers and other staff."
			filter={{ payerType: "STAFF", unpaidOnly: true }}
			headerAction={
				<div className="flex flex-wrap gap-2">
					<PaymentImportAction mode="STAFF" />
					<CreateSalariesAction />
					<PaySalariesAction />
				</div>
			}
			tableTitle="Salaries to pay"
			tableDescription="Staff pay that has not been paid in full."
			searchPlaceholder="Search staff"
			emptyTitle="No salaries due"
			emptyDescription="Staff pay waiting to be paid will appear here. Use Create salaries to add this month's or this term's pay."
		>
			<FinanceSectionTabs section="salaries" />
		</FinanceChargesPage>
	);
}
