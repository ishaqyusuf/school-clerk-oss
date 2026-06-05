"use client";

import { NumberInput } from "@/components/currency-input";
import { Card } from "@school-clerk/ui/composite";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";

function Stat({
	label,
	value,
	icon: Icon,
	trend,
	trendLabel,
	gradient,
}: {
	label: string;
	value: number;
	icon: typeof Wallet;
	trend?: string;
	trendLabel?: string;
	gradient?: string;
}) {
	return (
		<Card className={`overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${gradient}`}>
			<Card.Header className="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title className="text-sm font-medium">{label}</Card.Title>
				<div className="rounded-full bg-background/50 p-2 backdrop-blur-sm">
					<Icon className="h-4 w-4 text-muted-foreground" />
				</div>
			</Card.Header>
			<Card.Content>
				<div className="text-2xl font-bold tracking-tight">
					<NumberInput value={value} prefix="NGN " />
				</div>
				{trend && trendLabel && (
					<p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
						<span className={trend === "up" ? "text-emerald-500" : "text-rose-500"}>
							{trend === "up" ? "↑" : "↓"} {trendLabel}
						</span>
						<span>vs last month</span>
					</p>
				)}
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
				label="Total Income" 
				value={summary.totalCredit} 
				icon={ArrowUpRight}
				trend="up"
				trendLabel="12%"
				gradient="bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent border-emerald-500/20"
			/>
			<Stat 
				label="Total Expenses" 
				value={summary.totalDebit} 
				icon={ArrowDownRight}
				trend="down"
				trendLabel="4%"
				gradient="bg-gradient-to-br from-rose-500/10 via-transparent to-transparent border-rose-500/20"
			/>
			<Stat 
				label="Net Balance" 
				value={summary.totalBalance} 
				icon={Wallet}
				gradient="bg-gradient-to-br from-blue-500/10 via-transparent to-transparent border-blue-500/20"
			/>
		</div>
	);
}
