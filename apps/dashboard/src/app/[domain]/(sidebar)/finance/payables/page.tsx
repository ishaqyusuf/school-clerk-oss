import { FinanceChargesPage } from "@/components/finance/finance-charges-page";
import { FinancePayablesTabs } from "@/components/finance/finance-payables-tabs";

export default async function Page() {
	return (
		<FinanceChargesPage
			title="Payables"
			subtitle="Track school-side obligations, payment status, and account impact."
			filter={{ excludePayerType: "STUDENT" }}
			tableTitle="All Payables"
			tableDescription="School-side bills and obligations grouped by receiving account impact."
			searchPlaceholder="Search payables"
			emptyTitle="No payables"
			emptyDescription="School-side bills and obligations will appear here after they are recorded."
			emptyActionHref="/finance/setup/service-billables"
			emptyActionLabel="Set up service billables"
		>
			<FinancePayablesTabs />
		</FinanceChargesPage>
	);
}
