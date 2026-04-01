"use client";

import type { ListItem } from "@/actions/get-staff-list";
import type { ColumnDef } from "@tanstack/react-table";

import { ActionCell } from "../action-cell";

export type Item = ListItem;
export const columns: ColumnDef<Item>[] = [
	{
		header: "Teacher",
		accessorKey: "name",
		cell: ({ row: { original: item } }) => (
			<div className="flex flex-col">
				<span className="font-medium">
					{[item.title, item.name].filter(Boolean).join(" ")}
				</span>
				{item.email ? (
					<span className="text-muted-foreground text-sm">{item.email}</span>
				) : null}
			</div>
		),
	},
	// {
	//   header: "Department",
	//   accessorKey: "department",
	//   cell: ({ row: { original: item } }) => <div>{item.department}</div>,
	// },
	{
		header: "",
		accessorKey: "actions",
		meta: {
			className: "flex-1",
		},
		cell: ({ row: { original: item } }) => {
			return <ActionCell trash itemId={item.id} />;
		},
	},
];
