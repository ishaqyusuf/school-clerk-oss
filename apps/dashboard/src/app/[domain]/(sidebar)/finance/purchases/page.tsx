import { FinanceSectionTabs } from "@/components/finance/finance-section-tabs";
import { FinanceChargesPage } from "@/components/finance/finance-charges-page";
import { RecordPurchaseAction } from "@/components/finance/finance-page-actions";

export default async function Page() {
	return (
		<FinanceChargesPage
			title="Purchases"
			subtitle="Things the school buys, for school use or to sell to students (uniforms, books)."
			filter={{ spendCategory: "purchases" }}
			headerAction={<RecordPurchaseAction />}
			tableTitle="All purchases"
			tableDescription="Stationery, supplies and stock bought by the school."
			searchPlaceholder="Search items or suppliers"
			emptyTitle="No purchases yet"
			emptyDescription="Things the school buys will appear here once recorded."
		>
			<FinanceSectionTabs section="purchases" />
		</FinanceChargesPage>
	);
}
