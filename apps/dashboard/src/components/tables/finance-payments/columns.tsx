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
	{
		id: "actions",
		size: 50,
		cell: ({ row }) => <FinancePaymentRowActions row={row} />,
	},
];

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@school-clerk/ui/dropdown-menu";
import { Button } from "@school-clerk/ui/button";
import { MoreHorizontal, Undo } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

function FinancePaymentRowActions({ row }: { row: { original: FinancePaymentRow } }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const reversePayment = useMutation(
		trpc.finance.reverseStudentPayment.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.finance.getPayments.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.finance.getCharges.queryKey({}),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.finance.overview.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.finance.getLedgerEntries.queryKey(),
					}),
				]);
			},
		}),
	);

	if (row.original.status === "CANCELLED" || row.original.status === "REVERSED") {
		return null;
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="h-8 w-8 p-0">
					<span className="sr-only">Open menu</span>
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					className="text-destructive focus:text-destructive"
					onClick={() => reversePayment.mutate({ paymentId: row.original.id })}
				>
					<Undo className="mr-2 h-4 w-4" />
					Reverse Payment
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
