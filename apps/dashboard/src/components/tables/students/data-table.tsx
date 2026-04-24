"use client";

import { useStudentFilterParams } from "@/hooks/use-student-filter-params";
import { useTRPC } from "@/trpc/client";

import { useAuth } from "@/hooks/use-auth";
import { useStudentParams } from "@/hooks/use-student-params";
import { useStudentsStore } from "@/store/student";
import type { GetStudentsSchema } from "@api/trpc/schemas/schemas";
import { cn } from "@school-clerk/ui/cn";
import { EmptyState } from "@school-clerk/ui/custom/empty-state";
import { NoResults } from "@school-clerk/ui/custom/no-results";
import { Table, useTableData } from "@school-clerk/ui/data-table";
import { useTableScroll } from "@school-clerk/ui/hooks/use-table-scroll";
import { AnimatePresence } from "framer-motion";
import { LayoutGrid, List } from "lucide-react";
import { useState } from "react";
import { columns } from "./columns";
import { StudentGridCard } from "./student-grid-card";
import { StudentListRow } from "./student-list-row";

interface Props {
	defaultFilters?: GetStudentsSchema;
	grid?: boolean;
	onCreate?;
	className?: string;
}
export function DataTable({ grid = false, className, ...props }: Props) {
	const trpc = useTRPC();
	const { filter, hasFilters, setFilters } = useStudentFilterParams();
	const { data, ref, isFetching, hasNextPage } = useTableData({
		filter: {
			...filter,
			...(props.defaultFilters || {}),
		},
		route: trpc.students.index,
	});
	const auth = useAuth();
	const { update } = useStudentsStore();
	const { setParams, ...params } = useStudentParams();
	const tableScroll = useTableScroll({
		useColumnWidths: true,
		startFromColumn: 2,
	});
	const [viewMode, setViewMode] = useState<"list" | "grid">("grid");

	if (hasFilters && !data?.length) {
		return <NoResults setFilter={setFilters} />;
	}

	if (!data?.length && !isFetching) {
		return (
			<EmptyState
				className="flex-col gap-4"
				onCreate={
					props.onCreate ||
					((e) => {
						setParams({
							createStudent: true,
						});
					})
				}
			/>
		);
	}
	return (
		<Table.Provider
			args={[
				{
					columns: columns,
					data,
					props: {
						loadMoreRef: ref,
						hasNextPage,
					},
					tableScroll,
					tableMeta: {
						deleteAction(id) {},
						rowClick(id, rowData) {
							setParams({
								studentViewId: id,
							});
						},
					},
				},
			]}
		>
			<div className="bg-card border border-border rounded-xl shadow-sm">
				{/* Filters Bar */}
				<div className="p-4 border-b border-border flex items-center justify-end">
					<div className="flex flex-wrap items-center gap-3">
						{/* View Toggle */}
						<div className="flex bg-muted p-1 rounded-lg border border-border">
							<button
								type="button"
								onClick={() => setViewMode("list")}
								className={cn(
									"p-1.5 rounded transition-all",
									viewMode === "list"
										? "bg-background shadow text-primary"
										: "text-muted-foreground hover:text-foreground",
								)}
								title="List View"
							>
								<List className="w-4 h-4" />
							</button>
							<button
								type="button"
								onClick={() => setViewMode("grid")}
								className={cn(
									"p-1.5 rounded transition-all",
									viewMode === "grid"
										? "bg-background shadow text-primary"
										: "text-muted-foreground hover:text-foreground",
								)}
								title="Grid View"
							>
								<LayoutGrid className="w-4 h-4" />
							</button>
						</div>
					</div>
				</div>

				{/* Content Area */}
				<div className="min-h-[400px]">
					{viewMode === "list" ? (
						/* Table View */
						<div className="overflow-x-auto">
							<table className="w-full text-sm text-left border-collapse">
								<thead>
									<tr className="bg-muted/50 border-b border-border">
										<th className="px-6 py-4 font-semibold text-foreground">
											Student Name
										</th>
										<th className="px-6 py-4 font-semibold text-foreground">
											Department
										</th>
										<th className="px-6 py-4 font-semibold text-foreground">
											Gender
										</th>
										<th className="px-6 py-4 font-semibold text-foreground">
											Status
										</th>
										<th className="px-6 py-4 font-semibold text-foreground text-right">
											Actions
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border">
									{data?.map((student, index) => (
										<StudentListRow
											key={student.id || index}
											student={student}
											onClick={() => setParams({ studentViewId: student.id })}
										/>
									))}
								</tbody>
							</table>
						</div>
					) : (
						/* Grid View */
						<div className="p-6">
							<AnimatePresence initial={false}>
								<div
									className={cn(
										"grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
										className,
									)}
								>
									{data?.map((item, index) => (
										<div key={item.id || index}>
											<StudentGridCard item={item} />
										</div>
									))}
								</div>
							</AnimatePresence>
						</div>
					)}
				</div>

				{/* Footer with count */}
				<div className="px-6 py-4 border-t border-border flex items-center justify-between">
					<p className="text-xs text-muted-foreground">
						Showing {data?.length || 0} students
					</p>
				</div>
			</div>
			<Table.LoadMore />
		</Table.Provider>
	);
}
