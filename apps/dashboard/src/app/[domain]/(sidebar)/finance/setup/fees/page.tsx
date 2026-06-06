import { FinanceItemsPage } from "@/components/finance/finance-items-page";

export default async function Page() {
	return (
		<FinanceItemsPage
			title="Fee Structures"
			subtitle="Configure student fees by term, classroom scope, and receiving account."
			filter={{ excludeType: "SERVICE" }}
			actionLabel="Add Fee"
		/>
	);
}
