"use client";

import { TableSkeleton } from "@/components/tables/core";
import { type FinanceTransferRow, columns } from "./columns";

export function DataTableSkeleton() {
	return <TableSkeleton<FinanceTransferRow> columns={columns} rowCount={8} />;
}
