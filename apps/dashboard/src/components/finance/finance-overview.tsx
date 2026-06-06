"use client";

import { FinanceOverviewStats } from "@/components/finance/finance-overview-stats";
import { DataTable as FinanceStreamsTable } from "@/components/tables/finance-streams/data-table";
import { NumberInput } from "@/components/currency-input";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Card } from "@school-clerk/ui/composite";
import { Button } from "@school-clerk/ui/button";
import {
	AlertCircle,
	ArrowRightLeft,
	CreditCard,
	Coins,
	FileText,
	ReceiptText,
	Wallet,
} from "lucide-react";
import Link from "next/link";
import { useReceivePaymentParams } from "@/hooks/use-receive-payment-params";

type FinanceOverviewProps = {
	title?: string;
	subtitle?: string;
	initialStreamSettings?: Partial<TableSettings>;
};

export function FinanceOverview({
	title = "Overview",
	subtitle,
	initialStreamSettings,
}: FinanceOverviewProps) {
	const trpc = useTRPC();
	const { data } = useSuspenseQuery(trpc.finance.overview.queryOptions());
	const streams = data.streams;
	const { setParams } = useReceivePaymentParams();
	const pendingPayables = streams.reduce(
		(sum, stream) => sum + Number(stream.pendingBills || 0),
		0,
	);
	const pendingPayablesCount = streams.reduce(
		(sum, stream) => sum + Number(stream.pendingBillsCount || 0),
		0,
	);
	const owingAmount = streams.reduce(
		(sum, stream) => sum + Number(stream.owingAmount || 0),
		0,
	);
	const accountsAtRisk = streams.filter(
		(stream) => Number(stream.projectedBalance ?? stream.balance) < 0,
	).length;
	const activeBillables = streams.reduce(
		(sum, stream) =>
			sum + Number(stream.activeBillablesCount ?? stream.activeBillables ?? 0),
		0,
	);

	return (
		<div className="space-y-6 p-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					{subtitle || "Finance command center. Review account health and perform quick actions."}
				</p>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<Button
					variant="outline"
					className="h-24 flex-col gap-2"
					onClick={() => setParams({ receivePayment: true })}
				>
					<CreditCard className="h-6 w-6" />
					Receive Student Payment
				</Button>
				<Button variant="outline" className="h-24 flex-col gap-2" asChild>
					<Link href="/finance/setup/fees">
						<Coins className="h-6 w-6" />
						Create Fee Structure
					</Link>
				</Button>
				<Button variant="outline" className="h-24 flex-col gap-2" asChild>
					<Link href="/finance/payables">
						<FileText className="h-6 w-6" />
						Review Payables
					</Link>
				</Button>
				<Button variant="outline" className="h-24 flex-col gap-2" asChild>
					<Link href="/finance/accounts/transfers">
						<ArrowRightLeft className="h-6 w-6" />
						Transfer Funds
					</Link>
				</Button>
			</div>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<Card>
					<Card.Header className="pb-2">
						<Card.Title className="flex items-center gap-2 text-sm font-medium">
							<ReceiptText className="h-4 w-4 text-muted-foreground" />
							Student Receivables
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<p className="text-2xl font-bold">Review</p>
						<p className="mt-1 text-xs text-muted-foreground">
							Open student balances before collecting payments.
						</p>
						<Button variant="link" className="h-auto px-0" asChild>
							<Link href="/finance/students">View student balances</Link>
						</Button>
					</Card.Content>
				</Card>
				<Card>
					<Card.Header className="pb-2">
						<Card.Title className="flex items-center gap-2 text-sm font-medium">
							<FileText className="h-4 w-4 text-muted-foreground" />
							Pending Payables
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<div className="text-2xl font-bold">
							<NumberInput value={pendingPayables} prefix="NGN " />
						</div>
						<p className="mt-1 text-xs text-muted-foreground">
							{pendingPayablesCount} open payable
							{pendingPayablesCount === 1 ? "" : "s"} across accounts.
						</p>
						<Button variant="link" className="h-auto px-0" asChild>
							<Link href="/finance/payables">Review payables</Link>
						</Button>
					</Card.Content>
				</Card>
				<Card>
					<Card.Header className="pb-2">
						<Card.Title className="flex items-center gap-2 text-sm font-medium">
							<Wallet className="h-4 w-4 text-muted-foreground" />
							Account Risk
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<p className="text-2xl font-bold">{accountsAtRisk}</p>
						<div className="mt-1 text-xs text-muted-foreground">
							Accounts with negative projected balance.
							<div className="mt-1">
								Owing: <NumberInput value={owingAmount} prefix="NGN " />
							</div>
						</div>
						<Button variant="link" className="h-auto px-0" asChild>
							<Link href="/finance/accounts">Open accounts</Link>
						</Button>
					</Card.Content>
				</Card>
				<Card>
					<Card.Header className="pb-2">
						<Card.Title className="flex items-center gap-2 text-sm font-medium">
							<AlertCircle className="h-4 w-4 text-muted-foreground" />
							Reconciliation
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<p className="text-2xl font-bold">{activeBillables}</p>
						<p className="mt-1 text-xs text-muted-foreground">
							Active account-linked billables to keep aligned.
						</p>
						<Button variant="link" className="h-auto px-0" asChild>
							<Link href="/finance/reconciliation">Run checks</Link>
						</Button>
					</Card.Content>
				</Card>
			</div>

			<FinanceOverviewStats summary={data.summary} />

			<div>
				<h3 className="mb-4 text-lg font-medium">Account Health</h3>
				<FinanceStreamsTable
					data={streams}
					initialSettings={initialStreamSettings}
					onCreateStream={() => {
						window.location.href = "/finance/setup/fees";
					}}
				/>
			</div>
		</div>
	);
}
