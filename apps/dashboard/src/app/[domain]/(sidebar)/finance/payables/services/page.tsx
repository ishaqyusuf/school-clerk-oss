import { FinanceChargesPage } from "@/components/finance/finance-charges-page";
import { FinancePayablesTabs } from "@/components/finance/finance-payables-tabs";

export default async function Page() {
	return (
		<FinanceChargesPage
			title="Service Bills"
			subtitle="Track vendor, service, and operational bills owed by the school."
			filter={{ payerType: "SCHOOL", type: "SERVICE" }}
			tableTitle="Service Bill Records"
			tableDescription="Vendor, service, and operational bills owed by the school."
			searchPlaceholder="Search service bills"
			emptyTitle="No service bills"
			emptyDescription="Service bills will appear here after school-side service payables are recorded."
			emptyActionHref="/finance/setup/service-billables"
			emptyActionLabel="Set up service billables"
		>
			<FinancePayablesTabs />
		</FinanceChargesPage>
	);
}
