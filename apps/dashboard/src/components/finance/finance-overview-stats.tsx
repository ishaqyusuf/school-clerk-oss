"use client";

import { NumberInput } from "@/components/currency-input";
import { Card } from "@school-clerk/ui/composite";
import { ArrowDownRight, ArrowUpRight, Scale, Wallet } from "lucide-react";

function Stat({
	label,
	value,
	icon: Icon,
	helper,
}: {
	label: string;
	value: number;
	icon: typeof Wallet;
	helper: string;
}) {
	return (
		<Card>
			<Card.Header className="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title className="text-sm font-medium">{label}</Card.Title>
				<div className="rounded-md bg-muted p-2">
					<Icon className="h-4 w-4 text-muted-foreground" />
				</div>
			</Card.Header>
			<Card.Content>
				<div className="text-2xl font-bold tracking-tight">
					<NumberInput value={value} prefix="NGN " />
				</div>
				<p className="mt-2 text-xs text-muted-foreground">{helper}</p>
			</Card.Content>
		</Card>
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
		<div className="grid gap-4 md:grid-cols-3">
			<Stat
				label="Money In"
				value={summary.totalCredit}
				icon={ArrowUpRight}
				helper="Successful credits into finance accounts."
			/>
			<Stat
				label="Money Out"
				value={summary.totalDebit}
				icon={ArrowDownRight}
				helper="Successful debits and outgoing account movement."
			/>
			<Stat
				label="Available Balance"
				value={summary.totalBalance}
				icon={summary.totalBalance >= 0 ? Wallet : Scale}
				helper="Current ledger-backed balance across accounts."
			/>
		</div>
	);
}
