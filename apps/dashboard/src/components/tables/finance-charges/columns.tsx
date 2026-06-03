"use client";

import { NumberInput } from "@/components/currency-input";
import { Badge } from "@school-clerk/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";

export type FinanceChargeRow = {
	id: string;
	title: string;
	description?: string | null;
	amount: number;
	amountPaid: number;
	outstanding: number;
	status: string;
	collectionStatus: string;
	payerType: "STUDENT" | "STAFF" | "SCHOOL";
	studentName?: string | null;
	stream?: { id: string; name: string; accountType: string } | null;
	staffProfile?: { id: string; name: string; title?: string | null } | null;
	createdAt: string | Date;
};

function payerName(row: FinanceChargeRow) {
	return (
		row.studentName || row.staffProfile?.name || row.payerType.toLowerCase()
	);
}

export const columns: ColumnDef<FinanceChargeRow>[] = [
	{
		accessorKey: "title",
		header: "Charge",
		size: 300,
		meta: { headerLabel: "Charge", skeleton: { type: "text", width: "w-44" } },
		cell: ({ row }) => (
			<div className="min-w-0">
				<p className="truncate font-medium text-sm">{row.original.title}</p>
				<p className="truncate text-muted-foreground text-xs">
					{payerName(row.original)}
				</p>
			</div>
		),
		filterFn: (row, _columnId, value) => {
			const search = String(value ?? "").toLowerCase();
			return [
				row.original.title,
				row.original.description,
				payerName(row.original),
				row.original.stream?.name,
			]
				.filter(Boolean)
				.some((entry) => String(entry).toLowerCase().includes(search));
		},
	},
	{
		accessorKey: "stream",
		header: "Stream",
		size: 160,
		meta: { headerLabel: "Stream", skeleton: { type: "text", width: "w-28" } },
		cell: ({ row }) => (
			<span className="text-sm">{row.original.stream?.name ?? "-"}</span>
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
		accessorKey: "amountPaid",
		header: "Paid",
		size: 150,
		meta: { headerLabel: "Paid", skeleton: { type: "text", width: "w-24" } },
		cell: ({ row }) => (
			<NumberInput value={row.original.amountPaid} prefix="NGN " />
		),
	},
	{
		accessorKey: "outstanding",
		header: "Outstanding",
		size: 160,
		meta: {
			headerLabel: "Outstanding",
			skeleton: { type: "text", width: "w-24" },
		},
		cell: ({ row }) => (
			<NumberInput value={row.original.outstanding} prefix="NGN " />
		),
	},
	{
		accessorKey: "status",
		header: "Status",
		size: 150,
		meta: { headerLabel: "Status", skeleton: { type: "badge", width: "w-20" } },
		cell: ({ row }) => (
			<Badge
				variant={row.original.status === "PAID" ? "success" : "outline"}
				className="rounded-none"
			>
				{row.original.status.replace(/_/g, " ").toLowerCase()}
			</Badge>
		),
	},
];
