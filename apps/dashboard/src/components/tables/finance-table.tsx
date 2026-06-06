"use client";

import type { TableColumnMeta } from "@/components/tables/core";
import { EmptyState, NoResults } from "@/components/tables/core";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTableSettings } from "@/hooks/use-table-settings";
import { getTableConfig } from "@/utils/table-configs";
import {
	type TableId,
	type TableSettings,
	getColumnIds,
} from "@/utils/table-settings";
import { cn } from "@school-clerk/ui/cn";
import { Input } from "@school-clerk/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@school-clerk/ui/table";
import type { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

type FinanceTableProps<TData> = {
	data: TData[];
	columns: ColumnDef<TData>[];
	tableId: TableId;
	initialSettings?: Partial<TableSettings>;
	title: string;
	description: string;
	searchColumnId: string;
	searchPlaceholder: string;
	emptyTitle: string;
	emptyDescription: string;
	emptyActionHref?: string;
	emptyActionLabel?: string;
	action?: React.ReactNode;
};

export function FinanceTable<TData>({
	data,
	columns,
	tableId,
	initialSettings,
	title,
	description,
	searchColumnId,
	searchPlaceholder,
	emptyTitle,
	emptyDescription,
	emptyActionHref = "/finance",
	emptyActionLabel = "Back to finance",
	action,
}: FinanceTableProps<TData>) {
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const columnIds = useMemo(() => getColumnIds(columns), [columns]);
	const config = getTableConfig(tableId);
	const {
		columnVisibility,
		setColumnVisibility,
		columnSizing,
		setColumnSizing,
		columnOrder,
		setColumnOrder,
	} = useTableSettings({
		tableId,
		initialSettings,
		columnIds,
	});
	const { getStickyStyle, getStickyClassName } = useStickyColumns({
		columnVisibility,
		stickyColumns: config.stickyColumns,
	});
	const stickyColumnIds = useMemo(
		() => new Set(config.stickyColumns.map((column) => column.id)),
		[config.stickyColumns],
	);

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
	const visibleRows = table.getRowModel().rows;
	const hasFilters = columnFilters.length > 0;

	if (data.length === 0) {
		return (
			<div className="rounded-md border bg-background">
				<FinanceTableHeader
					table={table}
					title={title}
					description={description}
					searchColumnId={searchColumnId}
					searchPlaceholder={searchPlaceholder}
					action={action}
				/>
				<div className="min-h-[360px]">
					<EmptyState
						title={emptyTitle}
						description={emptyDescription}
						actionLabel={emptyActionLabel}
						onAction={() => {
							window.location.href = emptyActionHref;
						}}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="rounded-md border bg-background">
			<FinanceTableHeader
				table={table}
				title={title}
				description={description}
				searchColumnId={searchColumnId}
				searchPlaceholder={searchPlaceholder}
				action={action}
			/>
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
											className={cn(
												getStickyClassName(header.column.id),
												stickyColumnIds.has(header.column.id) &&
													"z-10 bg-background",
											)}
											style={{
												width: header.getSize(),
												...getStickyStyle(header.column.id),
											}}
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
												className={cn(
													meta?.className,
													getStickyClassName(cell.column.id),
													stickyColumnIds.has(cell.column.id) &&
														"z-10 bg-background",
												)}
												style={{
													width: cell.column.getSize(),
													...getStickyStyle(cell.column.id),
												}}
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

type FinanceTableHeaderProps<TData> = {
	table: ReturnType<typeof useReactTable<TData>>;
	title: string;
	description: string;
	searchColumnId: string;
	searchPlaceholder: string;
	action?: React.ReactNode;
};

function FinanceTableHeader<TData>({
	table,
	title,
	description,
	searchColumnId,
	searchPlaceholder,
	action,
}: FinanceTableHeaderProps<TData>) {
	return (
		<div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center">
			<div className="min-w-0 flex-1">
				<h2 className="font-medium text-sm">{title}</h2>
				<p className="text-muted-foreground text-xs">{description}</p>
			</div>
			<Input
				className="w-full sm:max-w-[240px]"
				placeholder={searchPlaceholder}
				value={
					(table.getColumn(searchColumnId)?.getFilterValue() as string) ?? ""
				}
				onChange={(event) =>
					table.getColumn(searchColumnId)?.setFilterValue(event.target.value)
				}
				autoComplete="off"
				autoCapitalize="none"
				autoCorrect="off"
				spellCheck="false"
			/>
			{action}
		</div>
	);
}
