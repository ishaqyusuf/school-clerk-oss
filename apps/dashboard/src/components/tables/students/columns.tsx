"use client";

import { useStudentParams } from "@/hooks/use-student-params";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Avatar, DropdownMenu } from "@school-clerk/ui/composite";
import { cn } from "@school-clerk/ui/cn";
import { Spinner } from "@school-clerk/ui/spinner";
import { getInitials } from "@school-clerk/utils";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { useMutation } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, MoreHorizontal } from "lucide-react";

import { _qc, _trpc } from "@/components/static-trpc";

export type Item = RouterOutputs["students"]["index"]["data"][number];

type Column = ColumnDef<Item>;

export function getStudentRowId(item: Item, index?: number) {
	return item.id?.toString() ?? `${item.studentName ?? "student"}-${index}`;
}

function StudentCell({ item }: { item: Item }) {
	const name = item.studentName || "-";

	return (
		<div className="flex min-w-0 items-center gap-3">
			<Avatar className="size-10 shrink-0 border bg-muted">
				<Avatar.Image src="/placeholder.svg" alt={name} />
				<Avatar.Fallback>{getInitials(name)}</Avatar.Fallback>
			</Avatar>
			<div className="min-w-0 space-y-0.5">
				<div className="truncate font-semibold uppercase" dir="auto">
					{name}
				</div>
				<div
					className="truncate text-[11px] text-muted-foreground"
					dir="auto"
				>
					{item.department || "No class assigned"}
				</div>
			</div>
		</div>
	);
}

function GenderCell({ item }: { item: Item }) {
	return (
		<Badge
			variant="outline"
			className="border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400"
		>
			{item.gender || "-"}
		</Badge>
	);
}

function StatusCell() {
	return (
		<Badge
			variant="outline"
			className="border-green-200 text-green-700 dark:border-green-800 dark:text-green-400"
		>
			Active
		</Badge>
	);
}

function StudentActions({ item }: { item: Item }) {
	const { setParams } = useStudentParams();
	const { mutate: deleteStudent, isPending: isDeleting } = useMutation(
		_trpc.students.deleteStudent.mutationOptions({
			onSuccess() {
				_qc.invalidateQueries({
					queryKey: _trpc.students.index.infiniteQueryKey(),
				});
				_qc.invalidateQueries({
					queryKey: _trpc.students.analytics.queryKey(),
				});
			},
			meta: {
				toastTitle: {
					error: "Unable to complete",
					loading: "Processing...",
					success: "Done!.",
				},
			},
		}),
	);
	const { mutate: changeGender } = useMutation(
		_trpc.students.changeGender.mutationOptions({
			onSuccess() {
				_qc.invalidateQueries({
					queryKey: _trpc.students.index.infiniteQueryKey(),
				});
			},
			meta: {
				toastTitle: {
					error: "Unable to update gender",
					loading: "Updating...",
					success: "Gender updated.",
				},
			},
		}),
	);

	return (
		<div className="flex items-center justify-center gap-1">
			<Button
				variant="ghost"
				size="icon"
				className="size-8"
				onClick={() => setParams({ studentViewId: item.id })}
			>
				<Eye className="size-4" />
			</Button>
			<DropdownMenu>
				<DropdownMenu.Trigger asChild>
					<Button variant="ghost" size="icon" className="size-8">
						{isDeleting ? (
							<Spinner />
						) : (
							<MoreHorizontal className="size-4" />
						)}
					</Button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end">
					<DropdownMenu.Item onClick={() => setParams({ studentViewId: item.id })}>
						View Details
					</DropdownMenu.Item>
					<DropdownMenu.Item
						disabled={item.gender === "Male"}
						onClick={() => changeGender({ id: item.id, gender: "Male" })}
					>
						Set as Male
					</DropdownMenu.Item>
					<DropdownMenu.Item
						disabled={item.gender === "Female"}
						onClick={() => changeGender({ id: item.id, gender: "Female" })}
					>
						Set as Female
					</DropdownMenu.Item>
					<DropdownMenu.Separator />
					<DropdownMenu.Item
						onClick={() => deleteStudent({ studentId: item.id })}
					>
						Delete Student
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu>
		</div>
	);
}

export const columns: Column[] = [
	{
		id: "studentName",
		header: "Student",
		accessorKey: "studentName",
		size: 320,
		minSize: 260,
		maxSize: 520,
		enableResizing: true,
		enableHiding: false,
		meta: {
			sticky: true,
			skeleton: { type: "avatar-text" },
			headerLabel: "Student",
			className:
				"w-[320px] min-w-[260px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		},
		cell: ({ row }) => <StudentCell item={row.original} />,
	},
	{
		id: "department",
		header: "Class",
		accessorKey: "department",
		size: 220,
		minSize: 160,
		maxSize: 320,
		enableResizing: true,
		meta: {
			skeleton: { type: "text", width: "w-28" },
			headerLabel: "Class",
			className: "w-[220px] min-w-[160px]",
		},
		cell: ({ row }) => (
			<span className="truncate text-muted-foreground" dir="auto">
				{row.original.department || "-"}
			</span>
		),
	},
	{
		id: "gender",
		header: "Gender",
		accessorKey: "gender",
		size: 140,
		minSize: 120,
		maxSize: 180,
		enableResizing: true,
		meta: {
			skeleton: { type: "badge" },
			headerLabel: "Gender",
			className: "w-[140px] min-w-[120px]",
		},
		cell: ({ row }) => <GenderCell item={row.original} />,
	},
	{
		id: "status",
		header: "Status",
		size: 140,
		minSize: 120,
		maxSize: 180,
		enableResizing: true,
		meta: {
			skeleton: { type: "badge" },
			headerLabel: "Status",
			className: "w-[140px] min-w-[120px]",
		},
		cell: () => <StatusCell />,
	},
	{
		id: "actions",
		header: "",
		size: 130,
		minSize: 110,
		maxSize: 150,
		enableResizing: false,
		enableHiding: false,
		enableSorting: false,
		meta: {
			skeleton: { type: "icon" },
			headerLabel: "Actions",
			className: cn(
				"w-[130px] min-w-[110px]",
				"bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary",
			),
		},
		cell: ({ row }) => <StudentActions item={row.original} />,
	},
];
