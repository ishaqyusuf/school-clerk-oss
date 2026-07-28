"use client";

import { StudentActionsMenu } from "@/components/tables/students/actions-menu";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@school-clerk/ui/badge";
import { Avatar } from "@school-clerk/ui/composite";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { cn } from "@school-clerk/ui/cn";
import { getInitials } from "@school-clerk/utils";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

export type Item = RouterOutputs["students"]["index"]["data"][number];

export function getStudentRowId(item: Item) {
	return item.id;
}

function StudentCell({ item }: { item: Item }) {
	return (
		<div className="flex min-w-0 items-center gap-3">
			<Avatar className="size-9 shrink-0 border bg-muted">
				<Avatar.Image src="/placeholder.svg" alt={item.studentName} />
				<Avatar.Fallback>{getInitials(item.studentName)}</Avatar.Fallback>
			</Avatar>
			<div className="min-w-0">
				<p className="truncate font-medium" dir="auto">
					{item.studentName}
				</p>
				<p className="truncate text-xs text-muted-foreground" dir="auto">
					{item.department || "No class assigned"}
				</p>
			</div>
		</div>
	);
}

function StatusCell({ status }: { status: Item["status"] }) {
	const enrolled = status === "enrolled";
	return (
		<Badge variant={enrolled ? "success" : "outline"} className="rounded-none">
			{enrolled ? "Enrolled" : "Not enrolled"}
		</Badge>
	);
}

export const columns: ColumnDef<Item>[] = [
	{
		id: "select",
		size: 50,
		minSize: 50,
		maxSize: 50,
		enableResizing: false,
		enableHiding: false,
		enableSorting: false,
		meta: {
			sticky: true,
			headerLabel: "Select",
			skeleton: { type: "checkbox" },
			className:
				"w-[50px] min-w-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-30 justify-center",
		},
		header: ({ table }) => (
			<Checkbox
				aria-label="Select all loaded students"
				checked={
					table.getIsAllPageRowsSelected()
						? true
						: table.getIsSomePageRowsSelected()
							? "indeterminate"
							: false
				}
				onCheckedChange={(value) =>
					table.toggleAllPageRowsSelected(value === true)
				}
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				aria-label={`Select ${row.original.studentName}`}
				checked={row.getIsSelected()}
				onCheckedChange={(value) => row.toggleSelected(value === true)}
				onClick={(event) => event.stopPropagation()}
			/>
		),
	},
	{
		id: "studentName",
		accessorKey: "studentName",
		header: "Student",
		size: 320,
		minSize: 260,
		maxSize: 520,
		enableHiding: false,
		meta: {
			sticky: true,
			headerLabel: "Student",
			skeleton: { type: "avatar-text", width: "w-32" },
			className:
				"w-[320px] min-w-[260px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		},
		cell: ({ row }) => <StudentCell item={row.original} />,
	},
	{
		id: "studentId",
		accessorKey: "id",
		header: "Student ID",
		size: 150,
		minSize: 120,
		maxSize: 220,
		meta: {
			headerLabel: "Student ID",
			skeleton: { type: "text", width: "w-24" },
		},
		cell: ({ row }) => (
			<span className="font-mono text-xs text-muted-foreground">
				{row.original.id.slice(0, 8)}
			</span>
		),
	},
	{
		id: "department",
		accessorKey: "department",
		header: "Class",
		size: 220,
		minSize: 160,
		maxSize: 320,
		meta: {
			headerLabel: "Class",
			skeleton: { type: "text", width: "w-28" },
		},
		cell: ({ row }) => (
			<span className="truncate text-muted-foreground" dir="auto">
				{row.original.department || "—"}
			</span>
		),
	},
	{
		id: "gender",
		accessorKey: "gender",
		header: "Gender",
		size: 120,
		minSize: 100,
		maxSize: 160,
		meta: {
			headerLabel: "Gender",
			skeleton: { type: "badge", width: "w-16" },
		},
		cell: ({ row }) => (
			<Badge variant="outline" className="rounded-none">
				{row.original.gender}
			</Badge>
		),
	},
	{
		id: "status",
		accessorKey: "status",
		header: "Status",
		size: 140,
		minSize: 120,
		maxSize: 180,
		meta: {
			headerLabel: "Status",
			skeleton: { type: "badge", width: "w-20" },
		},
		cell: ({ row }) => <StatusCell status={row.original.status} />,
	},
	{
		id: "dob",
		accessorKey: "dob",
		header: "Date of birth",
		size: 150,
		minSize: 130,
		maxSize: 200,
		meta: {
			headerLabel: "Date of birth",
			skeleton: { type: "text", width: "w-24" },
		},
		cell: ({ row }) =>
			row.original.dob
				? format(new Date(row.original.dob), "dd MMM yyyy")
				: "—",
	},
	{
		id: "guardianName",
		accessorKey: "guardianName",
		header: "Guardian",
		size: 220,
		minSize: 160,
		maxSize: 320,
		meta: {
			headerLabel: "Guardian",
			skeleton: { type: "text", width: "w-28" },
		},
		cell: ({ row }) => row.original.guardianName || "—",
	},
	{
		id: "guardianPhone",
		accessorKey: "guardianPhone",
		header: "Guardian phone",
		size: 180,
		minSize: 150,
		maxSize: 240,
		meta: {
			headerLabel: "Guardian phone",
			skeleton: { type: "text", width: "w-28" },
		},
		cell: ({ row }) => row.original.guardianPhone || "—",
	},
	{
		id: "actions",
		header: "Actions",
		size: 100,
		minSize: 100,
		maxSize: 100,
		enableResizing: false,
		enableHiding: false,
		enableSorting: false,
		meta: {
			sticky: true,
			headerLabel: "Actions",
			skeleton: { type: "icon" },
			className: cn(
				"w-[100px] min-w-[100px] text-right md:sticky md:end-0 z-30 justify-center",
				"bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary",
			),
		},
		cell: ({ row }) => <StudentActionsMenu student={row.original} />,
	},
];
