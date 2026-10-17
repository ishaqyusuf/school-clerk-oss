import { FinanceSectionTabs } from "@/components/finance/finance-section-tabs";
import { FinanceItemsPage } from "@/components/finance/finance-items-page";
import { CreateItemForm } from "@/components/finance/forms/create-item-form";

export default async function Page() {
	return (
		<FinanceItemsPage
			title="Finance settings"
			subtitle="What the school pays for: reusable services and expenses."
			filter={{ type: "SERVICE" }}
			tableTitle="What the school pays for"
			searchPlaceholder="Search expense items"
			emptyTitle="No expense items"
			emptyDescription="Add the services and expenses the school pays for regularly."
			emptyActionHref="/finance/services"
			emptyActionLabel="See service bills"
			showAddFeeAction={false}
		>
			<FinanceSectionTabs section="settings" />
			<div className="max-w-xl">
				<CreateItemForm
					allowedItemTypes={["SERVICE"]}
					defaultItemType="SERVICE"
					namePlaceholder="e.g. Generator maintenance"
					submitLabel="Save expense item"
					title="Add expense item"
				/>
			</div>
		</FinanceItemsPage>
	);
}
