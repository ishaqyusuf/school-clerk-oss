"use client";

import { FinanceTable } from "@/components/tables/finance-table";
import type { TableSettings } from "@/utils/table-settings";
import { type FinanceChargeRow, columns } from "./columns";

export function DataTable({
	data,
	initialSettings,
	tableTitle = "Finance Charges",
	tableDescription = "Student, staff, and school charges created from standardized finance items.",
	searchPlaceholder = "Search charges",
	emptyTitle = "No finance charges",
	emptyDescription = "Create a charge for a student, staff member, or school service to track receivables and payables.",
	emptyActionHref,
	emptyActionLabel,
}: {
	data: FinanceChargeRow[];
	initialSettings?: Partial<TableSettings>;
	tableTitle?: string;
	tableDescription?: string;
	searchPlaceholder?: string;
	emptyTitle?: string;
	emptyDescription?: string;
	emptyActionHref?: string;
	emptyActionLabel?: string;
}) {
	return (
		<FinanceTable
			data={data}
			columns={columns}
			tableId="financeCharges"
			initialSettings={initialSettings}
			title={tableTitle}
			description={tableDescription}
			searchColumnId="title"
			searchPlaceholder={searchPlaceholder}
			emptyTitle={emptyTitle}
			emptyDescription={emptyDescription}
			emptyActionHref={emptyActionHref}
			emptyActionLabel={emptyActionLabel}
		/>
	);
}
