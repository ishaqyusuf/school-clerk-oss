"use client";

import { NumberInput } from "@/components/currency-input";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Trash2 } from "lucide-react";

export type Item = {
	id: string;
	title: string;
	description?: string | null;
	amount?: number | null;
	streamName?: string | null;
	classroomDepartments?: Array<{ id: string; name: string | null }>;
};

export type BillableTableMeta = {
	onOpenBillable?: (billableId: string) => void;
	onDeleteBillable?: (args: { billableId: string; title: string }) => void;
};

export const columns: ColumnDef<Item>[] = [
	{
		header: "Service Billable",
		accessorKey: "billable",
		cell: ({ row: { original: item } }) => (
			<div>
				<div className="font-bold">{item.title}</div>
				<div className="">{item.description}</div>
			</div>
		),
	},
	{
		header: "Amount",
		accessorKey: "amount",
		meta: {
			className: "w-16",
		},
		cell: ({ row: { original: item } }) => (
			<div>
				<NumberInput prefix="NGN " value={item.amount} readOnly />
			</div>
		),
	},
	{
		header: "Stream",
		accessorKey: "streamName",
		cell: ({ row: { original: item } }) =>
			item.streamName ? (
				<Badge variant="outline">{item.streamName}</Badge>
			) : (
				"—"
			),
	},
	{
		header: "Staff Classrooms",
		accessorKey: "classroomDepartments",
		cell: ({ row: { original: item } }) =>
			item.classroomDepartments?.length ? (
				<div className="flex flex-wrap gap-1">
					{item.classroomDepartments.map((department) => (
						<Badge key={department.id} variant="secondary">
							{department.name}
						</Badge>
					))}
				</div>
			) : (
				<Badge variant="secondary">All classrooms</Badge>
			),
	},
	{
		id: "actions",
		header: "",
		meta: {
			className: "w-28",
		},
		cell: ({ row, table }) => {
			const item = row.original;
			const meta = table.options.meta as BillableTableMeta | undefined;

			return (
				<div className="flex items-center justify-end gap-2">
					<Button
						size="icon"
						variant="outline"
						className="h-8 w-8"
						onClick={(event) => {
							event.stopPropagation();
							meta?.onOpenBillable?.(item.id);
						}}
					>
						<Eye className="h-4 w-4" />
					</Button>
					<Button
						size="icon"
						variant="outline"
						className="h-8 w-8 text-destructive"
						onClick={(event) => {
							event.stopPropagation();
							meta?.onDeleteBillable?.({
								billableId: item.id,
								title: item.title,
							});
						}}
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			);
		},
	},
];
