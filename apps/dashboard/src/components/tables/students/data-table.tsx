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
import { cn } from "@school-clerk/ui/cn";
import { useTableScroll } from "@school-clerk/ui/hooks/use-table-scroll";
import { closestCenter, DndContext } from "@dnd-kit/core";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import {
	getCoreRowModel,
	type RowSelectionState,
	type Updater,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import {
	type VirtualItem,
	useVirtualizer,
	useWindowVirtualizer,
} from "@tanstack/react-virtual";
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
	scrollMode?: "container" | "page";
	/** Retained for classroom embeds; the shared student directory now always renders a table. */
	grid?: boolean;
	/**
	 * "url" (default): directory filters and search come from the page URL.
	 * "local": an embed (e.g. the classroom sheet) ignores page filters and
	 * searches with `search` only, so filters never leak between views.
	 */
	filterMode?: "url" | "local";
	search?: string;
	onClearSearch?: () => void;
	/**
	 * Columns an embed forces off (e.g. "department" inside a classroom, where
	 * every row is the same class). Never written to the shared table settings.
	 */
	hiddenColumns?: string[];
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
	scrollMode = "page",
	onCreate,
	filterMode = "url",
	search,
	onClearSearch,
	hiddenColumns,
}: Props) {
	const trpc = useTRPC();
	const academicDataDirection = useAcademicDataDirection();
	const urlFilters = useStudentFilterParams();
	const isLocalFilter = filterMode === "local";
	const localFilter = useMemo(
		() => ({ q: search?.trim() || null }) as typeof urlFilters.filter,
		[search],
	);
	const filter = isLocalFilter ? localFilter : urlFilters.filter;
	const hasFilters = isLocalFilter ? !!localFilter.q : urlFilters.hasFilters;
	const setFilters = urlFilters.setFilters;
	const { params: sortParams } = useSortParams();
	const deferredSearch = useDeferredValue(filter.q);
	const { setParams } = useStudentParams();
	const parentRef = useRef<HTMLDivElement>(null);
	const bodyRef = useRef<HTMLTableSectionElement>(null);
	const pageScrollRef = useRef<Window | null>(null);
	const [scrollMargin, setScrollMargin] = useState(0);
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
	const hiddenColumnsKey = hiddenColumns?.join(",") ?? "";
	const effectiveColumnVisibility = useMemo<VisibilityState>(
		() =>
			hiddenColumnsKey
				? {
						...columnVisibility,
						...Object.fromEntries(
							hiddenColumnsKey.split(",").map((id) => [id, false]),
						),
					}
				: columnVisibility,
		[columnVisibility, hiddenColumnsKey],
	);
	// Toggles made inside an embed persist everything except the forced-off
	// columns, which keep their saved directory value.
	const handleColumnVisibilityChange = useCallback(
		(updater: Updater<VisibilityState>) => {
			setColumnVisibility((current) => {
				const next =
					typeof updater === "function"
						? updater(effectiveColumnVisibility)
						: updater;
				if (!hiddenColumnsKey) return next;
				const restored = { ...next };
				for (const id of hiddenColumnsKey.split(",")) {
					if (id in current) restored[id] = current[id] as boolean;
					else delete restored[id];
				}
				return restored;
			});
		},
		[effectiveColumnVisibility, hiddenColumnsKey, setColumnVisibility],
	);

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
		onColumnVisibilityChange: handleColumnVisibilityChange,
		enableColumnResizing: true,
		columnResizeMode: "onChange",
		onColumnSizingChange: setColumnSizing,
		onColumnOrderChange: setColumnOrder,
		state: {
			rowSelection,
			columnVisibility: effectiveColumnVisibility,
			columnSizing,
			columnOrder,
		},
	});

	const { sensors, handleDragEnd } = useTableDnd(table);
	const { getStickyStyle, getStickyClassName } = useStickyColumns({
		direction: academicDataDirection,
		columnVisibility: effectiveColumnVisibility,
		table,
		stickyColumns: STICKY_COLUMNS.students,
	});
	const tableScroll = useTableScroll({
		direction: academicDataDirection,
		useColumnWidths: true,
		startFromColumn: 2,
	});
	const rows = table.getRowModel().rows;
	const containerVirtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => ROW_HEIGHT,
		overscan: 10,
		enabled: scrollMode === "container",
	});
	const pageVirtualizer = useWindowVirtualizer({
		count: rows.length,
		estimateSize: () => ROW_HEIGHT,
		overscan: 10,
		scrollMargin,
		enabled: scrollMode === "page",
	});
	const rowVirtualizer =
		scrollMode === "page" ? pageVirtualizer : containerVirtualizer;

	useEffect(() => {
		if (scrollMode !== "page") return;
		pageScrollRef.current = window;
		const measure = () => {
			if (bodyRef.current) {
				setScrollMargin(
					bodyRef.current.getBoundingClientRect().top + window.scrollY,
				);
			}
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(document.body);
		window.addEventListener("resize", measure);
		return () => {
			observer.disconnect();
			window.removeEventListener("resize", measure);
			pageScrollRef.current = null;
		};
	}, [scrollMode, rows.length]);

	useEffect(() => {
		setColumns(table.getAllLeafColumns());
	}, [effectiveColumnVisibility, setColumns, table]);

	useEffect(() => {
		bindShowColumnDividers(showColumnDividers, setShowColumnDividers);
	}, [bindShowColumnDividers, setShowColumnDividers, showColumnDividers]);

	useEffect(() => {
		setRowSelection({});
	}, [filter, sortParams.sort]);

	useInfiniteScroll<HTMLDivElement | Window>({
		scrollRef: scrollMode === "page" ? pageScrollRef : parentRef,
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
					isLocalFilter
						? onClearSearch?.()
						: setFilters({
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
					data-student-table-scroll={scrollMode}
					className={cn(
						"border-x border-b border-border scrollbar-hide",
						scrollMode === "page"
							? "overflow-x-auto"
							: "overflow-auto overscroll-contain",
					)}
					style={
						scrollMode === "container"
							? {
									height: "calc(100vh - 350px + var(--header-offset, 0px))",
								}
							: undefined
					}
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
								ref={bodyRef}
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
											virtualStart={
												virtualRow.start - rowVirtualizer.options.scrollMargin
											}
											rowHeight={ROW_HEIGHT}
											getStickyStyle={getStickyStyle}
											getStickyClassName={getStickyClassName}
											nonClickableColumns={NON_CLICKABLE_COLUMNS}
											onCellClick={handleCellClick}
											columnSizing={columnSizing}
											columnOrder={columnOrder}
											columnVisibility={effectiveColumnVisibility}
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
