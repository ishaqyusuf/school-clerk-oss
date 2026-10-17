import { FinanceSectionTabs } from "@/components/finance/finance-section-tabs";
import { FinanceChargesPage } from "@/components/finance/finance-charges-page";
import { RecordPurchaseAction } from "@/components/finance/finance-page-actions";

export default async function Page() {
	return (
		<FinanceChargesPage
			title="Purchases"
			subtitle="Stationery, chalk, cleaning and other things the school uses itself."
			filter={{ spendCategory: "purchases", purchasePurpose: "SCHOOL_USE" }}
			headerAction={<RecordPurchaseAction />}
			tableTitle="For school use"
			tableDescription="Purchases the school uses itself."
			searchPlaceholder="Search items or suppliers"
			emptyTitle="No purchases yet"
			emptyDescription="Things the school buys will appear here once recorded."
		>
			<FinanceSectionTabs section="purchases" />
		</FinanceChargesPage>
	);
}
