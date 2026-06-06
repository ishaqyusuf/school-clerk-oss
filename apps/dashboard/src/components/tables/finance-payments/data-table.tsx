"use client";

import { FinanceTable } from "@/components/tables/finance-table";
import type { TableSettings } from "@/utils/table-settings";
import { type FinancePaymentRow, columns } from "./columns";

export function DataTable({
	data,
	initialSettings,
	tableTitle = "Finance Payments",
	tableDescription = "Payments allocated to standardized finance charges.",
	searchPlaceholder = "Search payments",
	emptyTitle = "No finance payments",
	emptyDescription = "Payments recorded against charges will appear here.",
	emptyActionHref,
	emptyActionLabel,
}: {
	data: FinancePaymentRow[];
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
			tableId="financePayments"
			initialSettings={initialSettings}
			title={tableTitle}
			description={tableDescription}
			searchColumnId="payerName"
			searchPlaceholder={searchPlaceholder}
			emptyTitle={emptyTitle}
			emptyDescription={emptyDescription}
			emptyActionHref={emptyActionHref}
			emptyActionLabel={emptyActionLabel}
		/>
	);
}
