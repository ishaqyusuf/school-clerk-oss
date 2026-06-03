"use client";

import { NumberInput } from "@/components/currency-input";
import { Badge } from "@school-clerk/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";

export type FinanceItemRow = {
	id: string;
	name: string;
	title?: string;
	type: "TUITION_FEE" | "BOOK" | "SERVICE" | "SALARY" | "OTHER";
	streamName: string;
	description?: string | null;
	amount: number;
	collectable: boolean;
	isActive: boolean;
	chargesCount: number;
	applicableClasses?: {
		id: string;
		departmentName: string;
		className?: string | null;
	}[];
};

export const columns: ColumnDef<FinanceItemRow>[] = [
	{
		accessorKey: "name",
		header: "Item",
		size: 280,
		meta: { headerLabel: "Item", skeleton: { type: "text", width: "w-40" } },
		cell: ({ row }) => (
			<div className="min-w-0">
				<p className="truncate font-medium text-sm">{row.original.name}</p>
				<p className="truncate text-muted-foreground text-xs">
					{row.original.description || row.original.streamName}
				</p>
			</div>
		),
		filterFn: (row, _columnId, value) => {
			const search = String(value ?? "").toLowerCase();
			return [
				row.original.name,
				row.original.description,
				row.original.streamName,
				row.original.type,
			]
				.filter(Boolean)
				.some((entry) => String(entry).toLowerCase().includes(search));
		},
	},
	{
		accessorKey: "type",
		header: "Type",
		size: 140,
		meta: { headerLabel: "Type", skeleton: { type: "badge", width: "w-20" } },
		cell: ({ row }) => (
			<Badge variant="outline" className="rounded-none">
				{row.original.type.replace(/_/g, " ").toLowerCase()}
			</Badge>
		),
	},
	{
		accessorKey: "amount",
		header: "Amount",
		size: 150,
		meta: { headerLabel: "Amount", skeleton: { type: "text", width: "w-24" } },
		cell: ({ row }) => (
			<NumberInput value={row.original.amount} prefix="NGN " />
		),
	},
	{
		accessorKey: "chargesCount",
		header: "Charges",
		size: 110,
		meta: { headerLabel: "Charges", skeleton: { type: "text", width: "w-16" } },
		cell: ({ row }) => (
			<span className="text-sm">{row.original.chargesCount}</span>
		),
	},
	{
		accessorKey: "isActive",
		header: "Status",
		size: 120,
		meta: { headerLabel: "Status", skeleton: { type: "badge", width: "w-16" } },
		cell: ({ row }) => (
			<Badge
				variant={row.original.isActive ? "success" : "neutral"}
				className="rounded-none"
			>
				{row.original.isActive ? "Active" : "Inactive"}
			</Badge>
		),
	},
];
