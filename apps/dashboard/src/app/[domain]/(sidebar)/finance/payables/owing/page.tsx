import { FinanceChargesPage } from "@/components/finance/finance-charges-page";
import { FinancePayablesTabs } from "@/components/finance/finance-payables-tabs";

export default async function Page() {
	return (
		<FinanceChargesPage
			title="Owing & Repayments"
			subtitle="Track payable amounts already issued but still awaiting account funding."
			filter={{ payerType: "SCHOOL", status: "OWING" }}
			tableTitle="Owing Records"
			tableDescription="School-side payable amounts still awaiting repayment or funding."
			searchPlaceholder="Search owing records"
			emptyTitle="No owing records"
			emptyDescription="Owing records will appear here when payable amounts remain unsettled."
			emptyActionHref="/finance/payables"
			emptyActionLabel="Review payables"
		>
			<FinancePayablesTabs />
		</FinanceChargesPage>
	);
}
