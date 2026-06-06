import { FinanceChargesPage } from "@/components/finance/finance-charges-page";

export default async function Page() {
	return (
		<FinanceChargesPage
			title="Collections"
			subtitle="Review student-side collection activity and outstanding receivables."
			filter={{ payerType: "STUDENT" }}
			tableTitle="Student Collections"
			tableDescription="Student-side charges, balances, and collection status."
			searchPlaceholder="Search students or charges"
			emptyTitle="No student collections"
			emptyDescription="Student receivables and payment activity will appear here after charges are created."
			emptyActionHref="/finance/students"
			emptyActionLabel="Open student balances"
		/>
	);
}
