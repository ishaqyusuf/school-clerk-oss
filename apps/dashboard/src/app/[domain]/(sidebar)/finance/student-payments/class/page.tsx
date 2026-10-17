import { FinanceSectionTabs } from "@/components/finance/finance-section-tabs";
import { ClassCollectionSheet } from "@/components/finance/class-collection-sheet";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

export default function Page() {
	return (
		<div className="flex flex-col gap-6 p-6">
			<PageTitle>Student Payments</PageTitle>
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">Student Payments</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Pick a class and a fee, then type each student's payment down the
					roster. Every row posts as its own receipt.
				</p>
			</div>
			<FinanceSectionTabs section="student-payments" />
			<ClassCollectionSheet />
		</div>
	);
}
