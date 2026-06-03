"use client";

import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { useSuspenseQuery } from "@tanstack/react-query";
import { NumberInput } from "@/components/currency-input";
import { DataTable as FinanceLedgerTable } from "@/components/tables/finance-ledger/data-table";
import { useTRPC } from "@/trpc/client";

type FinanceStreamDetailProps = {
	streamId: string;
};

function StreamStat({
	label,
	value,
	icon: Icon,
}: {
	label: string;
	value: number;
	icon: typeof Wallet;
}) {
	return (
		<div className="rounded-md border bg-background p-4">
			<div className="flex items-center justify-between gap-3">
				<p className="text-sm text-muted-foreground">{label}</p>
				<Icon className="h-4 w-4 text-muted-foreground" />
			</div>
			<p className="mt-3 text-2xl font-semibold">
				<NumberInput value={value} prefix="NGN " />
			</p>
		</div>
	);
}

export function FinanceStreamDetail({ streamId }: FinanceStreamDetailProps) {
	const trpc = useTRPC();
	const { data } = useSuspenseQuery(
		trpc.finance.getStreamDetails.queryOptions({ streamId }),
	);

	return (
		<div className="space-y-6 p-6">
			<div className="space-y-3">
				<Button asChild variant="ghost" className="w-fit px-0 text-muted-foreground">
					<Link href="/finance/streams">
						<ArrowLeft className="h-4 w-4" />
						Back to streams
					</Link>
				</Button>
				<div className="flex flex-wrap items-center gap-3">
					<h1 className="text-2xl font-semibold tracking-tight">{data.name}</h1>
					<Badge
						variant={data.accountType === "CREDIT" ? "success" : "warning"}
						className="rounded-none"
					>
						{data.accountType === "CREDIT" ? "Credit" : "Debit"}
					</Badge>
				</div>
				<p className="text-muted-foreground text-sm">
					{data.description || `Ledger-backed stream activity for ${data.periodLabel}.`}
				</p>
			</div>

			<div className="grid gap-3 md:grid-cols-3">
				<StreamStat label="Credit" value={data.totalIn} icon={ArrowUpRight} />
				<StreamStat label="Debit" value={data.totalOut} icon={ArrowDownRight} />
				<StreamStat label="Balance" value={data.balance} icon={Wallet} />
			</div>

			<FinanceLedgerTable data={data.ledgerEntries} />
		</div>
	);
}
