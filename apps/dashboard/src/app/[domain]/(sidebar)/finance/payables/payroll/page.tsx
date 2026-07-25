import { FinanceChargesPage } from "@/components/finance/finance-charges-page";
import { FinancePayablesTabs } from "@/components/finance/finance-payables-tabs";
import { PaymentImportAction } from "@/components/finance/payment-import-action";

export default async function Page() {
	return (
		<FinanceChargesPage
			title="Payroll Bills"
			subtitle="Review staff remuneration obligations and payroll settlement status."
			filter={{ payerType: "STAFF" }}
			headerAction={<PaymentImportAction mode="STAFF" />}
			tableTitle="Payroll Bill Records"
			tableDescription="Staff remuneration bills, outstanding balances, and settlement status."
			searchPlaceholder="Search payroll bills"
			emptyTitle="No payroll bills"
			emptyDescription="Payroll bills will appear here after staff remuneration obligations are recorded."
			emptyActionHref="/staff/payroll"
			emptyActionLabel="Open staff payroll"
		>
			<FinancePayablesTabs />
		</FinanceChargesPage>
	);
}
