"use client";

import { FinanceTable } from "@/components/tables/finance-table";
import type { TableSettings } from "@/utils/table-settings";
import { type FinancePaymentRow, columns } from "./columns";

export function DataTable({
	data,
	initialSettings,
}: {
	data: FinancePaymentRow[];
	initialSettings?: Partial<TableSettings>;
}) {
	return (
		<FinanceTable
			data={data}
			columns={columns}
			tableId="financePayments"
			initialSettings={initialSettings}
			title="Finance Payments"
			description="Payments allocated to standardized finance charges."
			searchColumnId="payerName"
			searchPlaceholder="Search payments"
			emptyTitle="No finance payments"
			emptyDescription="Payments recorded against charges will appear here."
		/>
	);
}
