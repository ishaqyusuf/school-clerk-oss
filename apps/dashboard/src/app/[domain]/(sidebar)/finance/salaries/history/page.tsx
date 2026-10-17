import { FinanceSectionTabs } from "@/components/finance/finance-section-tabs";
import { FinanceChargesPage } from "@/components/finance/finance-charges-page";

export default async function Page() {
	return (
		<FinanceChargesPage
			title="Salaries"
			subtitle="Staff pay that has been paid."
			filter={{ payerType: "STAFF", status: "PAID" }}
			tableTitle="Paid salaries"
			tableDescription="Fully paid staff pay."
			searchPlaceholder="Search staff"
			emptyTitle="No salaries paid yet"
			emptyDescription="Paid staff salaries will appear here."
			emptyActionHref="/finance/salaries"
			emptyActionLabel="See salaries to pay"
		>
			<FinanceSectionTabs section="salaries" />
		</FinanceChargesPage>
	);
}
