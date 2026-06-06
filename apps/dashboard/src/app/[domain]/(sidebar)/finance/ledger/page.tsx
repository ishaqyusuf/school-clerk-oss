import { FinanceTransactionsPage } from "@/components/finance/finance-transactions-page";

export default async function Page() {
	return (
		<FinanceTransactionsPage
			title="Ledger"
			subtitle="Review posted finance movements across accounts."
		/>
	);
}
