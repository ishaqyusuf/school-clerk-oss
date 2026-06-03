"use client";

import { FinanceTable } from "@/components/tables/finance-table";
import type { TableSettings } from "@/utils/table-settings";
import { type FinanceTransferRow, columns } from "./columns";

export function DataTable({
	data,
	initialSettings,
}: {
	data: FinanceTransferRow[];
	initialSettings?: Partial<TableSettings>;
}) {
	return (
		<FinanceTable
			data={data}
			columns={columns}
			tableId="financeTransfers"
			initialSettings={initialSettings}
			title="Internal Transfers"
			description="Money transferred between finance streams."
			searchColumnId="fromStream"
			searchPlaceholder="Search transfers"
			emptyTitle="No internal transfers"
			emptyDescription="Transfers between account streams will appear here."
		/>
	);
}
