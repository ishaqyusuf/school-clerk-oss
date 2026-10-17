import { FinanceSectionTabs } from "@/components/finance/finance-section-tabs";
import { FinanceChargesPage } from "@/components/finance/finance-charges-page";
import { PayServiceAction } from "@/components/finance/finance-page-actions";

export default async function Page() {
	return (
		<FinanceChargesPage
			title="Services"
			subtitle="Everything the school still has to pay: services, purchases and staff pay."
			filter={{ excludePayerType: "STUDENT", unpaidOnly: true }}
			headerAction={<PayServiceAction />}
			tableTitle="Everything unpaid"
			tableDescription="Bills and staff pay not yet paid in full."
			searchPlaceholder="Search bills"
			emptyTitle="Every bill is paid"
			emptyDescription="Unpaid bills, purchases and salaries will appear here."
		>
			<FinanceSectionTabs section="services" />
		</FinanceChargesPage>
	);
}
