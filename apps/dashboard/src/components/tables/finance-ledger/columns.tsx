"use client";

import { NumberInput } from "@/components/currency-input";
import { Badge } from "@school-clerk/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

export type FinanceLedgerRow = {
	id?: string;
	direction?: "CREDIT" | "DEBIT";
	sourceType?: string;
	sourceId?: string | null;
	amount?: number;
	occurredAt?: string | Date;
	note?: string | null;
	charge?: {
		id: string;
		title: string;
		payerType: string;
		status: string;
	} | null;
	payment?: {
		id: string;
		reference?: string | null;
		method?: string | null;
		status: string;
	} | null;
	transfer?: {
		id: string;
		note?: string | null;
		status: string;
		fromStreamId: string;
		toStreamId: string;
	} | null;
};

function sourceLabel(row: FinanceLedgerRow) {
	if (row.charge) return row.charge.title;
	if (row.payment?.reference) return `Payment ${row.payment.reference}`;
	if (row.transfer?.note) return row.transfer.note;
	return (
		row.note ||
		row.sourceType?.replace(/_/g, " ").toLowerCase() ||
		"ledger entry"
	);
}

export const columns: ColumnDef<FinanceLedgerRow>[] = [
	{
		accessorKey: "occurredAt",
		header: "Date",
		size: 140,
		meta: {
			headerLabel: "Date",
			skeleton: { type: "text", width: "w-24" },
		},
		cell: ({ row }) => (
			<span className="text-sm">
				{row.original.occurredAt
					? format(new Date(row.original.occurredAt), "dd MMM yyyy")
					: "-"}
			</span>
		),
	},
	{
		id: "source",
		header: "Source",
		size: 320,
		minSize: 260,
		meta: {
			headerLabel: "Source",
			skeleton: { type: "text", width: "w-44" },
		},
		cell: ({ row }) => (
			<div className="min-w-0">
				<p className="truncate font-medium text-sm">
					{sourceLabel(row.original)}
				</p>
				<p className="truncate text-muted-foreground text-xs">
					{row.original.sourceType?.replace(/_/g, " ").toLowerCase() ??
						"ledger"}
				</p>
			</div>
		),
		filterFn: (row, _columnId, filterValue) => {
			const search = String(filterValue ?? "").toLowerCase();
			if (!search) return true;
			const entry = row.original;

			return [
				sourceLabel(entry),
				entry.note,
				entry.sourceType,
				entry.charge?.status,
				entry.payment?.reference,
				entry.payment?.method,
				entry.transfer?.note,
			]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(search));
		},
	},
	{
		accessorKey: "direction",
		header: "Direction",
		size: 120,
		meta: {
			headerLabel: "Direction",
			skeleton: { type: "badge", width: "w-16" },
		},
		cell: ({ row }) => (
			<Badge
				variant={row.original.direction === "CREDIT" ? "success" : "warning"}
				className="rounded-none"
			>
				{row.original.direction === "CREDIT" ? "Credit" : "Debit"}
			</Badge>
		),
	},
	{
		accessorKey: "amount",
		header: "Amount",
		size: 160,
		meta: {
			headerLabel: "Amount",
			skeleton: { type: "text", width: "w-28" },
		},
		cell: ({ row }) => (
			<div className="font-semibold text-sm">
				<NumberInput value={row.original.amount ?? 0} prefix="NGN " />
			</div>
		),
	},
	{
		id: "status",
		header: "Status",
		size: 140,
		meta: {
			headerLabel: "Status",
			skeleton: { type: "badge", width: "w-20" },
		},
		cell: ({ row }) => {
			const status =
				row.original.charge?.status ||
				row.original.payment?.status ||
				row.original.transfer?.status ||
				"POSTED";

			return (
				<Badge variant="outline" className="rounded-none">
					{status.replace(/_/g, " ").toLowerCase()}
				</Badge>
			);
		},
	},
];
