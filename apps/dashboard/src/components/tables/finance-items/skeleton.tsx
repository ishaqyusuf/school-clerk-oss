"use client";

import { TableSkeleton } from "@/components/tables/core";
import { type FinanceItemRow, columns } from "./columns";

export function DataTableSkeleton() {
	return <TableSkeleton<FinanceItemRow> columns={columns} rowCount={8} />;
}
