"use client";

import { NumberInput } from "@/components/currency-input";
import { Badge } from "@school-clerk/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";

export type FinanceStreamRow = {
	id: string;
	name: string;
	slug?: string;
	accountType: "CREDIT" | "DEBIT";
	defaultType?: "CREDIT" | "DEBIT" | "incoming" | "outgoing" | string;
	type?: "incoming" | "outgoing" | string;
	description?: string | null;
	isSystem?: boolean;
	credit: number;
	debit: number;
	balance: number;
	totalIn?: number;
	totalOut?: number;
	projectedBalance?: number;
	activeBillables?: number;
	activeBillablesCount?: number;
	counts?: {
		charges?: number;
		payments?: number;
		incomingTransfers?: number;
		outgoingTransfers?: number;
	};
};

function MoneyCell({ value }: { value: number }) {
	return (
		<div className="font-medium text-sm">
			<NumberInput value={value} prefix="NGN " />
		</div>
	);
}

export const columns: ColumnDef<FinanceStreamRow>[] = [
	{
		accessorKey: "name",
		header: "Stream",
		size: 280,
		minSize: 240,
		meta: {
			sticky: true,
			headerLabel: "Stream",
			skeleton: { type: "text", width: "w-40" },
			className:
				"bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f]",
		},
		cell: ({ row }) => {
			const stream = row.original;

			return (
				<div className="min-w-0">
					<div className="flex min-w-0 items-center gap-2">
						<span className="truncate font-medium">{stream.name}</span>
						{stream.isSystem ? (
							<Badge
								variant="outline"
								className="shrink-0 rounded-none text-[10px]"
							>
								System
							</Badge>
						) : null}
					</div>
					<p className="truncate text-muted-foreground text-xs">
						{stream.description || `${stream.accountType.toLowerCase()} stream`}
					</p>
				</div>
			);
		},
	},
	{
		accessorKey: "accountType",
		header: "Type",
		size: 120,
		meta: {
			headerLabel: "Type",
			skeleton: { type: "badge", width: "w-16" },
		},
		cell: ({ row }) => (
			<Badge
				variant={row.original.accountType === "CREDIT" ? "success" : "warning"}
				className="rounded-none"
			>
				{row.original.accountType === "CREDIT" ? "Credit" : "Debit"}
			</Badge>
		),
	},
	{
		accessorKey: "credit",
		header: "Credit",
		size: 150,
		meta: {
			headerLabel: "Credit",
			skeleton: { type: "text", width: "w-24" },
		},
		cell: ({ row }) => <MoneyCell value={row.original.credit} />,
	},
	{
		accessorKey: "debit",
		header: "Debit",
		size: 150,
		meta: {
			headerLabel: "Debit",
			skeleton: { type: "text", width: "w-24" },
		},
		cell: ({ row }) => <MoneyCell value={row.original.debit} />,
	},
	{
		accessorKey: "balance",
		header: "Balance",
		size: 160,
		meta: {
			headerLabel: "Balance",
			skeleton: { type: "text", width: "w-28" },
		},
		cell: ({ row }) => (
			<div className="font-semibold text-sm">
				<NumberInput value={row.original.balance} prefix="NGN " />
			</div>
		),
	},
	{
		id: "activity",
		header: "Activity",
		size: 160,
		meta: {
			headerLabel: "Activity",
			skeleton: { type: "text", width: "w-32" },
		},
		cell: ({ row }) => {
			const counts = row.original.counts;
			const charges = counts?.charges ?? row.original.activeBillablesCount ?? 0;
			const transfers =
				(counts?.incomingTransfers ?? 0) + (counts?.outgoingTransfers ?? 0);

			return (
				<div className="text-sm">
					<p>{charges} charges</p>
					<p className="text-muted-foreground text-xs">{transfers} transfers</p>
				</div>
			);
		},
	},
];
