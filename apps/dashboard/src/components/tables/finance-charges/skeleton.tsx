"use client";

import { TableSkeleton } from "@/components/tables/core";
import { type FinanceChargeRow, columns } from "./columns";

export function DataTableSkeleton() {
	return <TableSkeleton<FinanceChargeRow> columns={columns} rowCount={8} />;
}
