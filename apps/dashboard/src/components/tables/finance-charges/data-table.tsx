"use client";

import { FinanceTable } from "@/components/tables/finance-table";
import type { TableSettings } from "@/utils/table-settings";
import { type FinanceChargeRow, columns } from "./columns";

export function DataTable({
	data,
	initialSettings,
}: {
	data: FinanceChargeRow[];
	initialSettings?: Partial<TableSettings>;
}) {
	return (
		<FinanceTable
			data={data}
			columns={columns}
			tableId="financeCharges"
			initialSettings={initialSettings}
			title="Finance Charges"
			description="Student, staff, and school charges created from standardized finance items."
			searchColumnId="title"
			searchPlaceholder="Search charges"
			emptyTitle="No finance charges"
			emptyDescription="Create a charge for a student, staff member, or school service to track receivables and payables."
		/>
	);
}
