"use client";

import { HorizontalPagination } from "@/components/horizontal-pagination";
import {
	ACTIONS_STICKY_HEADER_CLASS,
	type TableScrollState,
	getHeaderLabel,
} from "@/components/tables/core";
import { DraggableHeader } from "@/components/tables/draggable-header";
import { ResizeHandle } from "@/components/tables/resize-handle";
import { useSortQuery } from "@/hooks/use-sort-query";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import {
	NON_REORDERABLE_COLUMNS,
	SORT_FIELD_MAPS,
	STICKY_COLUMNS,
} from "@/utils/table-configs";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import { TableHead, TableHeader, TableRow } from "@school-clerk/ui/table";
import {
	horizontalListSortingStrategy,
	SortableContext,
} from "@dnd-kit/sortable";
import type { Header, Table } from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo } from "react";

interface Props<TData> {
	direction?: "ltr" | "rtl";
	table?: Table<TData>;
	loading?: boolean;
	tableScroll?: TableScrollState;
	showColumnDividers?: boolean;
}

export function DataTableHeader<TData>({
	direction = "ltr",
	table,
	loading,
	tableScroll,
	showColumnDividers = false,
}: Props<TData>) {
	const { sortColumn, sortValue, createSortQuery } = useSortQuery();
	const { getStickyStyle, getStickyClassName, isVisible } = useStickyColumns({
		direction,
		table,
		loading,
		stickyColumns: STICKY_COLUMNS.students,
	});
	const sortableColumnIds = useMemo(
		() =>
			table
				?.getAllLeafColumns()
				.filter((column) => !NON_REORDERABLE_COLUMNS.students.has(column.id))
				.map((column) => column.id) ?? [],
		[table],
	);

	if (!table) return null;

	return (
		<TableHeader className="sticky top-0 z-40 block w-full border-0 bg-background">
			{table.getHeaderGroups().map((headerGroup) => (
				<TableRow
					key={headerGroup.id}
					className="flex h-[45px] min-w-full items-center border-b-0 hover:bg-transparent"
				>
					<SortableContext
						items={sortableColumnIds}
						strategy={horizontalListSortingStrategy}
					>
						{headerGroup.headers.map((header, headerIndex, headers) => {
							const columnId = header.column.id;
							const isStartSticky = STICKY_COLUMNS.students.some(
								(column) => column.id === columnId,
							);
							const isActions = columnId === "actions";
							const canReorder =
								!NON_REORDERABLE_COLUMNS.students.has(columnId);
							if (!isVisible(columnId)) return null;

							const hasNonStickyVisible = headers.some((item) => {
								if (
									item.column.id === "actions" ||
									!isVisible(item.column.id)
								) {
									return false;
								}
								return !STICKY_COLUMNS.students.some(
									(column) => column.id === item.column.id,
								);
							});
							const actionsFullWidth = isActions && !hasNonStickyVisible;
							const isLastBeforeActions =
								headerIndex === headers.length - 2 &&
								headers.at(-1)?.column.id === "actions";
							const shouldFlex =
								(isLastBeforeActions && !isStartSticky) || actionsFullWidth;

							const style = {
								width: actionsFullWidth ? undefined : header.getSize(),
								minWidth: actionsFullWidth
									? undefined
									: isStartSticky
										? header.getSize()
										: header.column.columnDef.minSize,
								maxWidth: actionsFullWidth
									? undefined
									: header.column.columnDef.maxSize,
								...(!actionsFullWidth && getStickyStyle(columnId)),
								...(isActions && !actionsFullWidth
									? { insetInlineEnd: 0 }
									: {}),
								...(shouldFlex ? { flex: 1 } : {}),
							};
							const divider =
								showColumnDividers &&
								headers
									.slice(headerIndex + 1)
									.some((item) => isVisible(item.column.id));

							const content = renderHeaderContent(
								header,
								columnId,
								sortColumn,
								sortValue,
								createSortQuery,
								tableScroll,
							);

							if (!canReorder) {
								return (
									<TableHead
										key={header.id}
										className={cn(
											isActions
												? ACTIONS_STICKY_HEADER_CLASS
												: getStickyClassName(
														columnId,
														"group/header relative flex h-full items-center border-t border-border bg-background px-4",
													),
											divider && "border-e",
											isActions && "md:end-0",
										)}
										style={style}
									>
										{content}
										<ResizeHandle header={header} />
									</TableHead>
								);
							}

							return (
								<DraggableHeader
									key={header.id}
									id={columnId}
									className={cn(divider && "border-e")}
									style={style}
								>
									{content}
									<ResizeHandle header={header} />
								</DraggableHeader>
							);
						})}
					</SortableContext>
				</TableRow>
			))}
		</TableHeader>
	);
}

function renderHeaderContent<TData>(
	header: Header<TData, unknown>,
	columnId: string,
	sortColumn: string | undefined,
	sortValue: string | undefined,
	createSortQuery: (name: string) => void,
	tableScroll?: TableScrollState,
) {
	if (columnId === "select") {
		return header.column.columnDef.header
			? typeof header.column.columnDef.header === "function"
				? header.column.columnDef.header(header.getContext())
				: header.column.columnDef.header
			: null;
	}
	if (columnId === "actions") {
		return (
			<span className="w-full text-center text-muted-foreground">Actions</span>
		);
	}

	const sortField = SORT_FIELD_MAPS.students[columnId];
	const label = getHeaderLabel(header.column.columnDef);
	const content = sortField ? (
		<SortButton
			label={label}
			sortField={sortField}
			currentSortColumn={sortColumn}
			currentSortValue={sortValue}
			onSort={createSortQuery}
		/>
	) : (
		<span className="truncate text-muted-foreground">{label}</span>
	);

	if (columnId !== "studentName") return content;

	return (
		<div className="flex w-full items-center justify-between gap-2 overflow-hidden">
			<div className="min-w-0 overflow-hidden">{content}</div>
			{tableScroll?.isScrollable ? (
				<HorizontalPagination
					canScrollLeft={tableScroll.canScrollLeft}
					canScrollRight={tableScroll.canScrollRight}
					onScrollLeft={tableScroll.scrollLeft}
					onScrollRight={tableScroll.scrollRight}
					className="hidden shrink-0 md:flex"
				/>
			) : null}
		</div>
	);
}

function SortButton({
	label,
	sortField,
	currentSortColumn,
	currentSortValue,
	onSort,
}: {
	label: string;
	sortField: string;
	currentSortColumn?: string;
	currentSortValue?: string;
	onSort: (field: string) => void;
}) {
	return (
		<Button
			variant="ghost"
			className="max-w-full space-x-2 p-0 hover:bg-transparent"
			onClick={(event) => {
				event.stopPropagation();
				onSort(sortField);
			}}
		>
			<span className="truncate">{label}</span>
			{sortField === currentSortColumn && currentSortValue === "asc" ? (
				<ArrowDown className="size-4 shrink-0" />
			) : null}
			{sortField === currentSortColumn && currentSortValue === "desc" ? (
				<ArrowUp className="size-4 shrink-0" />
			) : null}
		</Button>
	);
}
