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
			title="Account Transfers"
			description="Money transferred between finance accounts."
			searchColumnId="fromStream"
			searchPlaceholder="Search transfers"
			emptyTitle="No account transfers"
			emptyDescription="Transfers between finance accounts will appear here."
			emptyActionHref="/finance/accounts"
			emptyActionLabel="Open accounts"
		/>
	);
}
