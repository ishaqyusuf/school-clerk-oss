import { FinanceSectionTabs } from "@/components/finance/finance-section-tabs";
import { FinanceChargesPage } from "@/components/finance/finance-charges-page";
import { PayServiceAction } from "@/components/finance/finance-page-actions";

export default async function Page() {
	return (
		<FinanceChargesPage
			title="Services"
			subtitle="Diesel, internet, security, repairs: work and services the school pays for."
			filter={{ spendCategory: "services" }}
			headerAction={<PayServiceAction />}
			tableTitle="Service bills"
			tableDescription="Paid and unpaid bills for services."
			searchPlaceholder="Search services or suppliers"
			emptyTitle="No service bills"
			emptyDescription="Bills for services the school pays for will appear here."
		>
			<FinanceSectionTabs section="services" />
		</FinanceChargesPage>
	);
}
