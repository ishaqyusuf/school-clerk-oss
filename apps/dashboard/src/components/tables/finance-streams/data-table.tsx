"use client";

import type { TableColumnMeta } from "@/components/tables/core";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTableSettings } from "@/hooks/use-table-settings";
import { getTableConfig } from "@/utils/table-configs";
import { type TableSettings, getColumnIds } from "@/utils/table-settings";
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
import { useMemo, useState } from "react";
import { type FinanceStreamRow, columns } from "./columns";
import { EmptyStreams, NoResults } from "./empty-states";
import { DataTableSkeleton } from "./skeleton";
import { DataTableHeader } from "./table-header";

type Props = {
	data: FinanceStreamRow[];
	loading?: boolean;
	onCreateStream?: () => void;
	initialSettings?: Partial<TableSettings>;
};

const COLUMN_IDS = getColumnIds(columns);

export function DataTable({
	data,
	loading,
	onCreateStream = () => undefined,
	initialSettings,
}: Props) {
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const config = getTableConfig("financeStreams");
	const {
		columnVisibility,
		setColumnVisibility,
		columnSizing,
		setColumnSizing,
		columnOrder,
		setColumnOrder,
	} = useTableSettings({
		tableId: "financeStreams",
		initialSettings,
		columnIds: COLUMN_IDS,
	});
	const { getStickyStyle, getStickyClassName } = useStickyColumns({
		columnVisibility,
		stickyColumns: config.stickyColumns,
	});

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		enableColumnResizing: true,
		columnResizeMode: "onChange",
		onColumnSizingChange: setColumnSizing,
		onColumnOrderChange: setColumnOrder,
		onColumnFiltersChange: setColumnFilters,
		state: {
			columnFilters,
			columnVisibility,
			columnSizing,
			columnOrder,
		},
	});

	const hasFilters = columnFilters.length > 0;
	const visibleRows = table.getRowModel().rows;
	const stickyColumnIds = useMemo(
		() => new Set(config.stickyColumns.map((column) => column.id)),
		[config.stickyColumns],
	);

	if (loading) {
		return (
			<div className="rounded-md border bg-background">
				<DataTableHeader table={table} />
				<DataTableSkeleton />
			</div>
		);
	}

	if (data.length === 0) {
		return (
			<div className="rounded-md border bg-background">
				<DataTableHeader table={table} />
				<div className="min-h-[360px]">
					<EmptyStreams onCreate={onCreateStream} />
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
					<Table className="min-w-[920px]">
						<TableHeader className="block border-0 bg-background">
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow
									key={headerGroup.id}
									className="flex h-[45px] items-center border-b-0 hover:bg-transparent"
								>
									{headerGroup.headers.map((header) => {
										const sticky = stickyColumnIds.has(header.column.id);

										return (
											<TableHead
												key={header.id}
												className={cn(
													"group/header relative flex h-full items-center border-border border-t px-4 text-muted-foreground",
													getStickyClassName(header.column.id),
													sticky && "z-10 bg-background",
												)}
												style={{
													width: header.getSize(),
													minWidth: sticky
														? header.getSize()
														: header.column.columnDef.minSize,
													maxWidth: header.column.columnDef.maxSize,
													...getStickyStyle(header.column.id),
													borderRight: "1px solid hsl(var(--border))",
												}}
											>
												{header.isPlaceholder
													? null
													: flexRender(
															header.column.columnDef.header,
															header.getContext(),
														)}
											</TableHead>
										);
									})}
								</TableRow>
							))}
						</TableHeader>

						<TableBody className="block border-0">
							{visibleRows.map((row) => (
								<TableRow
									key={row.id}
									className="group flex h-[56px] items-center border-border border-b hover:bg-[#F2F1EF] hover:dark:bg-[#0f0f0f]"
								>
									{row.getVisibleCells().map((cell) => {
										const sticky = stickyColumnIds.has(cell.column.id);
										const meta = cell.column.columnDef.meta as
											| TableColumnMeta
											| undefined;

										return (
											<TableCell
												key={cell.id}
												className={cn(
													"flex h-full items-center border-border px-4",
													getStickyClassName(cell.column.id, meta?.className),
													sticky && "z-10",
												)}
												style={{
													width: cell.column.getSize(),
													minWidth: sticky
														? cell.column.getSize()
														: cell.column.columnDef.minSize,
													maxWidth: cell.column.columnDef.maxSize,
													...getStickyStyle(cell.column.id),
													borderRight: "1px solid hsl(var(--border))",
												}}
											>
												<div className="w-full truncate overflow-hidden">
													{flexRender(
														cell.column.columnDef.cell,
														cell.getContext(),
													)}
												</div>
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
