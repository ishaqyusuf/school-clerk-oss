"use client";

import { FinanceTable } from "@/components/tables/finance-table";
import type { TableSettings } from "@/utils/table-settings";
import { type FinanceItemRow, columns } from "./columns";

export function DataTable({
	data,
	initialSettings,
}: {
	data: FinanceItemRow[];
	initialSettings?: Partial<TableSettings>;
}) {
	return (
		<FinanceTable
			data={data}
			columns={columns}
			tableId="financeItems"
			initialSettings={initialSettings}
			title="Finance Items"
			description="Reusable tuition, book, service, salary, and other billable definitions."
			searchColumnId="name"
			searchPlaceholder="Search items"
			emptyTitle="No finance items"
			emptyDescription="Create tuition fees, books, services, or salary items from the finance quick actions."
		/>
	);
}
