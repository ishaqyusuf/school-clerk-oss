"use client";

import { VirtualRow } from "@/components/tables/core";
import { useAcademicDataDirection } from "@/components/academic-data-direction/provider";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useSortParams } from "@/hooks/use-sort-params";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useStudentFilterParams } from "@/hooks/use-student-filter-params";
import { useStudentParams } from "@/hooks/use-student-params";
import { useTableDnd } from "@/hooks/use-table-dnd";
import { useTableSettings } from "@/hooks/use-table-settings";
import { useTRPC } from "@/trpc/client";
import { ROW_HEIGHTS, STICKY_COLUMNS } from "@/utils/table-configs";
import { type TableSettings, getColumnIds } from "@/utils/table-settings";
import type { GetStudentsSchema } from "@api/trpc/schemas/students";
import { Table, TableBody } from "@school-clerk/ui/table";
import { useTableScroll } from "@school-clerk/ui/hooks/use-table-scroll";
import { closestCenter, DndContext } from "@dnd-kit/core";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import {
	getCoreRowModel,
	type RowSelectionState,
	useReactTable,
} from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import {
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { columns, getStudentRowId, type Item } from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { StudentsBottomBar } from "./bottom-bar";
import { useStudentsTableStore } from "./store";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set(["select", "actions"]);
const COLUMN_IDS = getColumnIds(columns);
const ROW_HEIGHT = ROW_HEIGHTS.students;

type StudentsPage = {
	data?: Item[];
	meta?: {
		cursor?: string | number | null;
	};
};

interface Props {
	defaultFilters?: GetStudentsSchema;
	onCreate?: () => void;
	className?: string;
	initialSettings?: Partial<TableSettings>;
	singlePage?: boolean;
	/** Retained for classroom embeds; the shared student directory now always renders a table. */
	grid?: boolean;
}

function normalizeSort(sort: string[] | null): GetStudentsSchema["sort"] {
	if (!sort || sort.length !== 2) return null;
	const [field, direction] = sort;
	if (
		!["studentName", "gender", "dob", "createdAt"].includes(field ?? "") ||
		!["asc", "desc"].includes(direction ?? "")
	) {
		return null;
	}
	return [field, direction] as GetStudentsSchema["sort"];
}

export function DataTable({
	className,
	defaultFilters,
	initialSettings,
	singlePage,
	onCreate,
}: Props) {
	const trpc = useTRPC();
	const academicDataDirection = useAcademicDataDirection();
	const { filter, hasFilters, setFilters } = useStudentFilterParams();
	const { params: sortParams } = useSortParams();
	const deferredSearch = useDeferredValue(filter.q);
	const { setParams } = useStudentParams();
	const parentRef = useRef<HTMLDivElement>(null);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const setColumns = useStudentsTableStore((state) => state.setColumns);
	const bindShowColumnDividers = useStudentsTableStore(
		(state) => state.bindShowColumnDividers,
	);

	const {
		columnVisibility,
		setColumnVisibility,
		columnSizing,
		setColumnSizing,
		columnOrder,
		setColumnOrder,
		showColumnDividers,
		setShowColumnDividers,
	} = useTableSettings({
		tableId: "students",
		initialSettings,
		columnIds: COLUMN_IDS,
		showColumnDividers: true,
	});

	const queryInput = {
		...filter,
		...(defaultFilters || {}),
		q: deferredSearch,
		sort: normalizeSort(sortParams.sort),
	} satisfies GetStudentsSchema;

	const infiniteQueryOptions = trpc.students.index.infiniteQueryOptions(
		queryInput,
		{
			getNextPageParam: (lastPage) =>
				(lastPage as StudentsPage).meta?.cursor ?? undefined,
		},
	);

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useSuspenseInfiniteQuery(infiniteQueryOptions);

	const tableData = useMemo(
		() => data?.pages.flatMap((page) => page?.data ?? []) ?? [],
		[data],
	);

	const table = useReactTable({
		data: tableData,
		getRowId: getStudentRowId,
		columns,
		getCoreRowModel: getCoreRowModel(),
		enableRowSelection: true,
		onRowSelectionChange: setRowSelection,
		onColumnVisibilityChange: setColumnVisibility,
		enableColumnResizing: true,
		columnResizeMode: "onChange",
		onColumnSizingChange: setColumnSizing,
		onColumnOrderChange: setColumnOrder,
		state: {
			rowSelection,
			columnVisibility,
			columnSizing,
			columnOrder,
		},
	});

	const { sensors, handleDragEnd } = useTableDnd(table);
	const { getStickyStyle, getStickyClassName } = useStickyColumns({
		direction: academicDataDirection,
		columnVisibility,
		table,
		stickyColumns: STICKY_COLUMNS.students,
	});
	const tableScroll = useTableScroll({
		direction: academicDataDirection,
		useColumnWidths: true,
		startFromColumn: 2,
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
	}, [columnVisibility, setColumns, table]);

	useEffect(() => {
		bindShowColumnDividers(showColumnDividers, setShowColumnDividers);
	}, [bindShowColumnDividers, setShowColumnDividers, showColumnDividers]);

	useEffect(() => {
		setRowSelection({});
	}, [filter, sortParams.sort]);

	useInfiniteScroll<HTMLDivElement>({
		scrollRef: parentRef,
		rowVirtualizer,
		rowCount: rows.length,
		hasNextPage: singlePage ? false : hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
	});

	const handleCellClick = useCallback(
		(rowId: string) => {
			setParams({ studentViewId: rowId });
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
						classroomDepartmentIds: null,
						departmentTitles: null,
						sessionTermId: null,
						sessionId: null,
						status: null,
            admissionTypes: null,
            enrollmentDate: null,
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
					(() => {
						setParams({ createStudent: true });
					})
				}
			/>
		);
	}

	const virtualItems = rowVirtualizer.getVirtualItems();
	const selectedCount = Object.values(rowSelection).filter(Boolean).length;

	return (
		<div className="relative" dir={academicDataDirection}>
			<div className="w-full">
				<div
					ref={(element) => {
						parentRef.current = element;
						tableScroll.containerRef.current = element;
					}}
					className="overflow-auto overscroll-contain border-x border-b border-border scrollbar-hide"
					style={{
						height: "calc(100vh - 350px + var(--header-offset, 0px))",
					}}
				>
					<DndContext
						id="students-table-dnd"
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={handleDragEnd}
					>
						<Table className={className} dir={academicDataDirection}>
							<DataTableHeader
								direction={academicDataDirection}
								table={table}
								tableScroll={tableScroll}
								showColumnDividers={showColumnDividers}
							/>
							<TableBody
								className="block border-0"
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
											isSelected={row.getIsSelected()}
											showColumnDividers={showColumnDividers}
										/>
									);
								})}
							</TableBody>
						</Table>
					</DndContext>
					{isFetchingNextPage ? (
						<p className="py-3 text-center text-xs text-muted-foreground">
							Loading more students…
						</p>
					) : null}
				</div>
			</div>

			{selectedCount > 0 ? (
				<StudentsBottomBar
					data={tableData}
					rowSelection={rowSelection}
					setRowSelection={setRowSelection}
				/>
			) : null}
		</div>
	);
}
