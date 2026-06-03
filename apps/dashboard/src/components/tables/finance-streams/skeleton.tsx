"use client";

import { TableSkeleton } from "@/components/tables/core";
import { type FinanceStreamRow, columns } from "./columns";

export function DataTableSkeleton() {
	return (
		<TableSkeleton<FinanceStreamRow>
			columns={columns}
			rowCount={5}
			stickyColumnIds={["name"]}
		/>
	);
}
