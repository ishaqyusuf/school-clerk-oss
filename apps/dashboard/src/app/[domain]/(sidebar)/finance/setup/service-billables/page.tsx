import { FinanceItemsPage } from "@/components/finance/finance-items-page";
import { CreateItemForm } from "@/components/finance/forms/create-item-form";

export default async function Page() {
	return (
		<FinanceItemsPage
			title="Service Billables"
			subtitle="Configure reusable school-side service and expense items for payables."
			filter={{ type: "SERVICE" }}
			showAddFeeAction={false}
		>
			<div className="max-w-xl">
				<CreateItemForm
					allowedItemTypes={["SERVICE"]}
					defaultItemType="SERVICE"
					namePlaceholder="e.g. Generator maintenance"
					submitLabel="Save Service Billable"
					title="Create Service Billable"
				/>
			</div>
		</FinanceItemsPage>
	);
}
