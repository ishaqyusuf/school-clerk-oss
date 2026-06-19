"use client";

import { TableGrid, VirtualRow } from "@/components/tables/core";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useStudentFilterParams } from "@/hooks/use-student-filter-params";
import { useStudentParams } from "@/hooks/use-student-params";
import { useTableSettings } from "@/hooks/use-table-settings";
import { useTRPC } from "@/trpc/client";
import { STICKY_COLUMNS } from "@/utils/table-configs";
import { type TableSettings, getColumnIds } from "@/utils/table-settings";
import type { GetStudentsSchema } from "@api/trpc/schemas/schemas";
import { Table, TableBody } from "@school-clerk/ui/table";
import { useTableScroll } from "@school-clerk/ui/hooks/use-table-scroll";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef } from "react";

import { columns, getStudentRowId, type Item } from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { useStudentsTableStore } from "./store";
import { StudentGridCard } from "./student-grid-card";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set(["actions"]);
const COLUMN_IDS = getColumnIds(columns);
const ROW_HEIGHT = 72;

type StudentsPage = {
	data?: Item[];
	meta?: {
		cursor?: string | number | null;
	};
};

interface Props {
	defaultFilters?: GetStudentsSchema;
	grid?: boolean;
	onCreate?: () => void;
	className?: string;
	initialSettings?: Partial<TableSettings>;
	singlePage?: boolean;
}

export function DataTable({
	grid = false,
	className,
	defaultFilters,
	initialSettings,
	singlePage,
	onCreate,
}: Props) {
	const trpc = useTRPC();
	const { filter, hasFilters, setFilters } = useStudentFilterParams();
	const deferredSearch = useDeferredValue(filter.q);
	const { setParams } = useStudentParams();
	const parentRef = useRef<HTMLDivElement>(null);
	const setColumns = useStudentsTableStore((state) => state.setColumns);
	const bindShowColumnDividers = useStudentsTableStore(
		(state) => state.bindShowColumnDividers,
	);
	const bindViewMode = useStudentsTableStore((state) => state.bindViewMode);

	const {
		columnVisibility,
		setColumnVisibility,
		columnSizing,
		setColumnSizing,
		columnOrder,
		setColumnOrder,
		showColumnDividers,
		setShowColumnDividers,
		viewMode,
		setViewMode,
	} = useTableSettings({
		tableId: "students",
		initialSettings: {
			...(grid ? { viewMode: "grid" as const } : {}),
			...(initialSettings || {}),
		},
		columnIds: COLUMN_IDS,
		showColumnDividers: true,
	});

	const queryInput = {
		...filter,
		...(defaultFilters || {}),
		q: deferredSearch,
	} as GetStudentsSchema;

	const infiniteQueryOptions = trpc.students.index.infiniteQueryOptions(
		queryInput,
		{
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		},
	);

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useSuspenseInfiniteQuery<StudentsPage>(infiniteQueryOptions as never);

	const tableData = useMemo(() => {
		return data?.pages.flatMap((page) => page?.data ?? []) ?? [];
	}, [data]);

	const table = useReactTable({
		data: tableData,
		getRowId: getStudentRowId,
		columns,
		getCoreRowModel: getCoreRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		enableColumnResizing: true,
		columnResizeMode: "onChange",
		onColumnSizingChange: setColumnSizing,
		onColumnOrderChange: setColumnOrder,
		state: {
			columnVisibility,
			columnSizing,
			columnOrder,
		},
	});

	const { getStickyStyle, getStickyClassName } = useStickyColumns({
		columnVisibility,
		table,
		stickyColumns: STICKY_COLUMNS.students,
	});
	const tableScroll = useTableScroll({
		useColumnWidths: true,
		startFromColumn: 1,
	});
	const rows = table.getRowModel().rows;
	const rowVirtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => ROW_HEIGHT,
		overscan: 10,
	});

	useEffect(() => {
		setColumns(table.getAllLeafColumns());
	}, [setColumns, table]);

	useEffect(() => {
		bindShowColumnDividers(showColumnDividers, setShowColumnDividers);
	}, [bindShowColumnDividers, showColumnDividers, setShowColumnDividers]);

	useEffect(() => {
		bindViewMode(viewMode, setViewMode);
	}, [bindViewMode, viewMode, setViewMode]);

	useInfiniteScroll<HTMLDivElement>({
		scrollRef: parentRef,
		rowVirtualizer,
		rowCount: rows.length,
		hasNextPage: viewMode === "table" && !singlePage ? hasNextPage : false,
		isFetchingNextPage,
		fetchNextPage,
	});

	useEffect(() => {
		const scrollElement = parentRef.current;
		if (!scrollElement || viewMode !== "grid") return;

		const checkLoadMore = () => {
			if (singlePage || isFetchingNextPage || !hasNextPage) return;

			const distanceFromBottom =
				scrollElement.scrollHeight -
				scrollElement.scrollTop -
				scrollElement.clientHeight;

			if (distanceFromBottom < 600) {
				fetchNextPage();
			}
		};

		checkLoadMore();
		scrollElement.addEventListener("scroll", checkLoadMore, {
			passive: true,
		});

		return () => scrollElement.removeEventListener("scroll", checkLoadMore);
	}, [
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		rows.length,
		singlePage,
		viewMode,
	]);

	const handleCellClick = useCallback(
		(rowId: string) => {
			setParams({
				studentViewId: rowId,
			});
		},
		[setParams],
	);

	if (hasFilters && tableData.length === 0) {
		return (
			<NoResults
				onClear={() =>
					setFilters({
						classroomTitle: null,
						departmentId: null,
						departmentTitles: null,
						sessionTermId: null,
						sessionId: null,
						status: null,
						q: null,
					})
				}
			/>
		);
	}

	if (tableData.length === 0) {
		return (
			<EmptyState
				onCreate={
					onCreate ??
					(() =>
						setParams({
							createStudent: true,
						}))
				}
			/>
		);
	}

	const virtualItems = rowVirtualizer.getVirtualItems();

	return (
		<div className="relative">
			{viewMode === "grid" ? (
				<TableGrid
					rows={rows}
					scrollRef={parentRef}
					contentClassName={className}
					isFetchingNextPage={isFetchingNextPage}
					renderItem={(row) => (
						<StudentGridCard key={row.id} item={row.original} />
					)}
				/>
			) : (
				<div className="w-full">
					<div
						ref={(element) => {
							parentRef.current = element;
							tableScroll.containerRef.current = element;
						}}
						className="overflow-auto overscroll-contain border-b border-l border-r border-border scrollbar-hide"
						style={{
							height: "calc(100vh - 240px + var(--header-offset, 0px))",
						}}
					>
						<Table className="w-full min-w-full">
							<DataTableHeader
								table={table}
								tableScroll={tableScroll}
								showColumnDividers={showColumnDividers}
							/>

							<TableBody
								className="block border-l-0 border-r-0"
								style={{
									height: `${rowVirtualizer.getTotalSize()}px`,
									position: "relative",
								}}
							>
								{virtualItems.map((virtualRow: VirtualItem) => {
									const row = rows[virtualRow.index];
									if (!row) return null;

									return (
										<VirtualRow
											key={row.id}
											row={row}
											virtualStart={virtualRow.start}
											rowHeight={ROW_HEIGHT}
											getStickyStyle={getStickyStyle}
											getStickyClassName={getStickyClassName}
											nonClickableColumns={NON_CLICKABLE_COLUMNS}
											onCellClick={handleCellClick}
											columnSizing={columnSizing}
											columnOrder={columnOrder}
											columnVisibility={columnVisibility}
											showColumnDividers={showColumnDividers}
										/>
									);
								})}
							</TableBody>
						</Table>
					</div>
				</div>
			)}
		</div>
	);
}
