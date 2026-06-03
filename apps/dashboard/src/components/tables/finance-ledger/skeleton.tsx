"use client";

import { TableSkeleton } from "@/components/tables/core";
import { type FinanceLedgerRow, columns } from "./columns";

export function DataTableSkeleton() {
	return <TableSkeleton<FinanceLedgerRow> columns={columns} rowCount={8} />;
}
