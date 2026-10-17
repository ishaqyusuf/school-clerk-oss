import { FinanceSectionTabs } from "@/components/finance/finance-section-tabs";
import { CreateSalariesAction } from "@/components/finance/finance-page-actions";
import { StaffPaySetupTable } from "@/components/finance/payroll/staff-pay-setup-table";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

export default async function Page() {
	return (
		<div className="flex flex-col gap-6 p-6">
			<PageTitle>Salaries</PageTitle>
			<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
				<div>
					<h1 className="font-semibold text-2xl tracking-tight">Salaries</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						How often each staff member is paid, and how much.
					</p>
				</div>
				<CreateSalariesAction variant="outline" />
			</div>
			<FinanceSectionTabs section="salaries" />
			<StaffPaySetupTable />
		</div>
	);
}
