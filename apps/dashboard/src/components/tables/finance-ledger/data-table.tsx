"use client";

import type { TableColumnMeta } from "@/components/tables/core";
import { cn } from "@school-clerk/ui/cn";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@school-clerk/ui/table";
import type { ColumnFiltersState } from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { type FinanceLedgerRow, columns } from "./columns";
import { EmptyLedger, NoResults } from "./empty-states";
import { DataTableHeader } from "./table-header";

type Props = {
	data: FinanceLedgerRow[];
};

export function DataTable({ data }: Props) {
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onColumnFiltersChange: setColumnFilters,
		state: {
			columnFilters,
		},
	});
	const visibleRows = table.getRowModel().rows;
	const hasFilters = columnFilters.length > 0;

	if (data.length === 0) {
		return (
			<div className="rounded-md border bg-background">
				<DataTableHeader table={table} />
				<div className="min-h-[360px]">
					<EmptyLedger />
				</div>
			</div>
		);
	}

	return (
		<div className="rounded-md border bg-background">
			<DataTableHeader table={table} />
			{visibleRows.length === 0 && hasFilters ? (
				<div className="min-h-[360px]">
					<NoResults onClear={() => setColumnFilters([])} />
				</div>
			) : (
				<div className="overflow-auto overscroll-x-none">
					<Table className="min-w-[860px]">
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id} className="hover:bg-transparent">
									{headerGroup.headers.map((header) => (
										<TableHead
											key={header.id}
											style={{ width: header.getSize() }}
										>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
										</TableHead>
									))}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{visibleRows.map((row) => (
								<TableRow key={row.id}>
									{row.getVisibleCells().map((cell) => {
										const meta = cell.column.columnDef.meta as
											| TableColumnMeta
											| undefined;

										return (
											<TableCell
												key={cell.id}
												className={cn(meta?.className)}
												style={{ width: cell.column.getSize() }}
											>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</TableCell>
										);
									})}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}
