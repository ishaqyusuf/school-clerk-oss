"use client";

import { NumberInput } from "@/components/currency-input";
import { Badge } from "@school-clerk/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

export type FinanceTransferRow = {
	id?: string;
	fromStream?: { id: string; name: string };
	toStream?: { id: string; name: string };
	amount?: number;
	status?: string;
	note?: string | null;
	createdAt?: string | Date;
};

export const columns: ColumnDef<FinanceTransferRow>[] = [
	{
		accessorKey: "fromStream",
		header: "From",
		size: 220,
		meta: { headerLabel: "From", skeleton: { type: "text", width: "w-36" } },
		cell: ({ row }) => (
			<span className="font-medium text-sm">
				{row.original.fromStream?.name ?? "Unknown"}
			</span>
		),
		filterFn: (row, _columnId, value) => {
			const search = String(value ?? "").toLowerCase();
			return [
				row.original.fromStream?.name,
				row.original.toStream?.name,
				row.original.note,
			]
				.filter(Boolean)
				.some((entry) => String(entry).toLowerCase().includes(search));
		},
	},
	{
		accessorKey: "toStream",
		header: "To",
		size: 220,
		meta: { headerLabel: "To", skeleton: { type: "text", width: "w-36" } },
		cell: ({ row }) => (
			<span className="font-medium text-sm">
				{row.original.toStream?.name ?? "Unknown"}
			</span>
		),
	},
	{
		accessorKey: "amount",
		header: "Amount",
		size: 150,
		meta: { headerLabel: "Amount", skeleton: { type: "text", width: "w-24" } },
		cell: ({ row }) => (
			<NumberInput value={row.original.amount ?? 0} prefix="NGN " />
		),
	},
	{
		accessorKey: "createdAt",
		header: "Date",
		size: 140,
		meta: { headerLabel: "Date", skeleton: { type: "text", width: "w-24" } },
		cell: ({ row }) => (
			<span className="text-sm">
				{row.original.createdAt
					? format(new Date(row.original.createdAt), "dd MMM yyyy")
					: "-"}
			</span>
		),
	},
	{
		accessorKey: "status",
		header: "Status",
		size: 130,
		meta: { headerLabel: "Status", skeleton: { type: "badge", width: "w-20" } },
		cell: ({ row }) => (
			<Badge
				variant={
					row.original.status === "COMPLETED" ||
					row.original.status === "completed"
						? "success"
						: "outline"
				}
				className="rounded-none"
			>
				{row.original.status?.toLowerCase() ?? "unknown"}
			</Badge>
		),
	},
];
