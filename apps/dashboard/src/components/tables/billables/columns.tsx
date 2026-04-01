"use client";

import { NumberInput } from "@/components/currency-input";
import { Badge } from "@school-clerk/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";

export type Item = {
	id: string;
	title: string;
	description?: string | null;
	amount?: number | null;
	streamName?: string | null;
	classroomDepartments?: Array<{ id: string; name: string | null }>;
};
export const columns: ColumnDef<Item>[] = [
	{
		header: "Billable",
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
		header: "Classrooms",
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
		header: "",
		accessorKey: "action",
		meta: {
			className: "",
		},
		cell: ({ row: { original: item } }) => <div />,
	},
];
