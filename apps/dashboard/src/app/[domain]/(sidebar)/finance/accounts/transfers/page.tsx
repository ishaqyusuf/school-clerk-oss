import { FinanceSectionTabs } from "@/components/finance/finance-section-tabs";
import { FinanceTransfersPage } from "@/components/finance/finance-transfers-page";

export default async function Page() {
	return (
		<FinanceTransfersPage title="Accounts" subtitle="Money moved between the school's accounts.">
			<FinanceSectionTabs section="accounts" />
		</FinanceTransfersPage>
	);
}
