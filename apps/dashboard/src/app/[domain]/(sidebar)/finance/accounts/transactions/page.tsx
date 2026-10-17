import { FinanceSectionTabs } from "@/components/finance/finance-section-tabs";
import { FinanceTransactionsPage } from "@/components/finance/finance-transactions-page";

export default async function Page() {
	return (
		<FinanceTransactionsPage title="Accounts" subtitle="Every amount that came in, went out or moved between accounts.">
			<FinanceSectionTabs section="accounts" />
		</FinanceTransactionsPage>
	);
}
