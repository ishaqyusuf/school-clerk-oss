import { FinanceSectionTabs } from "@/components/finance/finance-section-tabs";
import { FinanceItemsPage } from "@/components/finance/finance-items-page";

export default async function Page() {
	return (
		<FinanceItemsPage
			title="Finance settings"
			subtitle="What students pay: fees by term and class, and items sold to students."
			filter={{ excludeType: "SERVICE" }}
			tableTitle="What students pay"
			emptyActionHref="/finance/student-payments"
			emptyActionLabel="Receive student payment"
			actionLabel="Add Fee"
		>
			<FinanceSectionTabs section="settings" />
		</FinanceItemsPage>
	);
}
