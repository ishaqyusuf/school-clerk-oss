import { FinanceSectionTabs } from "@/components/finance/finance-section-tabs";
import { FinanceReconciliationPage } from "@/components/finance/finance-reconciliation-page";

export default async function Page() {
	return (
		<FinanceReconciliationPage title="Accounts" subtitle="Check the term's records, export reports and close the term.">
			<FinanceSectionTabs section="accounts" />
		</FinanceReconciliationPage>
	);
}
