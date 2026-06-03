"use client";

import { NumberInput } from "@/components/currency-input";
import { Badge } from "@school-clerk/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

export type FinancePaymentRow = {
	id: string;
	stream?: { id: string; name: string; accountType: string } | null;
	payerName?: string | null;
	payerType: "STUDENT" | "STAFF" | "SCHOOL";
	amount: number;
	status: string;
	paymentDate: string | Date;
	method?: string | null;
	reference?: string | null;
	note?: string | null;
	allocations?: {
		id: string;
		chargeId: string;
		amount: number;
		charge: { title: string };
	}[];
};

export const columns: ColumnDef<FinancePaymentRow>[] = [
	{
		accessorKey: "payerName",
		header: "Payer",
		size: 260,
		meta: { headerLabel: "Payer", skeleton: { type: "text", width: "w-40" } },
		cell: ({ row }) => (
			<div className="min-w-0">
				<p className="truncate font-medium text-sm">
					{row.original.payerName || row.original.payerType.toLowerCase()}
				</p>
				<p className="truncate text-muted-foreground text-xs">
					{row.original.reference || row.original.method || "Payment"}
				</p>
			</div>
		),
		filterFn: (row, _columnId, value) => {
			const search = String(value ?? "").toLowerCase();
			return [
				row.original.payerName,
				row.original.reference,
				row.original.method,
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
		accessorKey: "paymentDate",
		header: "Date",
		size: 140,
		meta: { headerLabel: "Date", skeleton: { type: "text", width: "w-24" } },
		cell: ({ row }) => (
			<span className="text-sm">
				{format(new Date(row.original.paymentDate), "dd MMM yyyy")}
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
				variant={row.original.status === "PAID" ? "success" : "outline"}
				className="rounded-none"
			>
				{row.original.status.toLowerCase()}
			</Badge>
		),
	},
];
