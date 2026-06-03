"use client";

import { TableSkeleton } from "@/components/tables/core";
import { type FinancePaymentRow, columns } from "./columns";

export function DataTableSkeleton() {
	return <TableSkeleton<FinancePaymentRow> columns={columns} rowCount={8} />;
}
