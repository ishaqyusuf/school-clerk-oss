"use client";

import {
	CustomSheet,
	CustomSheetContent,
} from "@/components/custom-sheet-content";
import { DataTable as FinanceLedgerTable } from "@/components/tables/finance-ledger/data-table";
import { useFinanceSheetParams } from "@/hooks/use-finance-sheet-params";
import { useFinanceWorkspaceParams } from "@/hooks/use-finance-workspace-params";
import { useTRPC } from "@/trpc/client";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { SheetHeader, SheetTitle } from "@school-clerk/ui/sheet";
import { Skeleton } from "@school-clerk/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
	ArrowDownRight,
	ArrowRight,
	ArrowUpRight,
	RefreshCcw,
	Wallet,
} from "lucide-react";

const money = new Intl.NumberFormat("en-NG", {
	style: "currency",
	currency: "NGN",
	maximumFractionDigits: 2,
});

export function FinanceAccountSheet() {
	const { financeAccountId, setParams } = useFinanceSheetParams();
	const { filter } = useFinanceWorkspaceParams();
	const trpc = useTRPC();
	const isOpen = Boolean(financeAccountId);
	const { data, isLoading } = useQuery(
		trpc.finance.getAccountDetails.queryOptions(
			{
				accountId: financeAccountId ?? "",
				period: filter.period,
			},
			{ enabled: isOpen },
		),
	);

	if (!isOpen) return null;

	return (
		<CustomSheet
			floating
			rounded
			size="2xl"
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) setParams({ financeAccountId: null });
			}}
			sheetName="finance-account"
		>
			<SheetHeader>
				<SheetTitle>{data?.name ?? "Finance account"}</SheetTitle>
			</SheetHeader>
			<CustomSheetContent>
				{isLoading || !data ? (
					<div className="space-y-4">
						<Skeleton className="h-24 w-full" />
						<Skeleton className="h-48 w-full" />
					</div>
				) : (
					<div className="space-y-6">
						<div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
							<div>
								<div className="flex flex-wrap items-center gap-2">
									<h2 className="text-xl font-semibold">{data.name}</h2>
									<Badge variant="outline" className="rounded-none">
										{data.accountType === "CREDIT" ? "Incoming" : "Outgoing"}
									</Badge>
								</div>
								<p className="mt-1 text-sm text-muted-foreground">
									{data.description ||
										`Ledger-backed activity · ${data.periodLabel}`}
								</p>
							</div>
							<div className="flex flex-wrap gap-2">
								<Button
									variant="outline"
									size="sm"
									className="gap-2"
									onClick={() =>
										setParams({
											financeAccountId: null,
											transferFunds: true,
											transferFromAccountId: data.id,
										})
									}
								>
									<RefreshCcw className="h-4 w-4" />
									Transfer
								</Button>
								<Button asChild size="sm" className="gap-2">
									<Link href={`/finance/accounts/${data.id}`}>
										Full statement
										<ArrowRight className="h-4 w-4" />
									</Link>
								</Button>
							</div>
						</div>

						<div className="grid gap-3 sm:grid-cols-2">
							<AccountMetric
								label="Money In"
								value={data.moneyIn}
								icon={ArrowUpRight}
							/>
							<AccountMetric
								label="Money Out"
								value={data.moneyOut}
								icon={ArrowDownRight}
							/>
							<AccountMetric
								label="Ledger Balance"
								value={data.ledgerBalance}
								icon={Wallet}
							/>
							<AccountMetric
								label="Projected Balance"
								value={data.projectedBalance}
								icon={Wallet}
							/>
						</div>

						<div className="border bg-muted/20 p-4 text-sm">
							<div className="flex items-center justify-between gap-4">
								<span className="text-muted-foreground">
									Pending obligations
								</span>
								<span className="font-medium tabular-nums">
									{money.format(data.pendingObligations)}
								</span>
							</div>
							<p className="mt-2 text-xs text-muted-foreground">
								Projected balance equals ledger balance less unpaid staff and
								school obligations for this period.
							</p>
						</div>

						<div>
							<h3 className="mb-3 font-medium">Recent activity</h3>
							<FinanceLedgerTable data={data.ledgerEntries} />
						</div>
					</div>
				)}
			</CustomSheetContent>
		</CustomSheet>
	);
}

function AccountMetric({
	label,
	value,
	icon: Icon,
}: {
	label: string;
	value: number;
	icon: typeof Wallet;
}) {
	return (
		<div className="border bg-background p-4">
			<div className="flex items-center justify-between gap-3">
				<p className="text-xs text-muted-foreground">{label}</p>
				<Icon className="h-4 w-4 text-muted-foreground" />
			</div>
			<p className="mt-2 text-xl font-semibold tabular-nums">
				{money.format(value)}
			</p>
		</div>
	);
}
