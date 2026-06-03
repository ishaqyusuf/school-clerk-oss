"use client";

import { NumberInput } from "@/components/currency-input";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";

function Stat({
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

type FinanceOverviewStatsProps = {
	summary: {
		totalCredit: number;
		totalDebit: number;
		totalBalance: number;
	};
};

export function FinanceOverviewStats({ summary }: FinanceOverviewStatsProps) {
	return (
		<div className="grid gap-3 md:grid-cols-3">
			<Stat label="Credits" value={summary.totalCredit} icon={ArrowUpRight} />
			<Stat label="Debits" value={summary.totalDebit} icon={ArrowDownRight} />
			<Stat label="Balance" value={summary.totalBalance} icon={Wallet} />
		</div>
	);
}
