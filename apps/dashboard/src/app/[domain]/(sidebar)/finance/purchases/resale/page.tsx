import { FinanceSectionTabs } from "@/components/finance/finance-section-tabs";
import { FinanceChargesPage } from "@/components/finance/finance-charges-page";
import { RecordPurchaseAction } from "@/components/finance/finance-page-actions";

export default async function Page() {
	return (
		<FinanceChargesPage
			title="Purchases"
			subtitle="Uniforms, textbooks and other stock bought to sell to students."
			filter={{ spendCategory: "purchases", purchasePurpose: "RESALE" }}
			headerAction={<RecordPurchaseAction />}
			tableTitle="To sell to students"
			tableDescription="Stock bought to sell on to students."
			searchPlaceholder="Search items or suppliers"
			emptyTitle="No purchases yet"
			emptyDescription="Things the school buys will appear here once recorded."
		>
			<FinanceSectionTabs section="purchases" />
		</FinanceChargesPage>
	);
}
