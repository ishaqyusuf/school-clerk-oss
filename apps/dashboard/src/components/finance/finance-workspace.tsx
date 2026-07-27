"use client";

import {
	FinanceColumnVisibility,
	FinanceWorkspaceTable,
	defaultFinanceColumns,
} from "@/components/finance/finance-workspace-table";
import { useFinanceSheetParams } from "@/hooks/use-finance-sheet-params";
import { useFinanceWorkspaceParams } from "@/hooks/use-finance-workspace-params";
import { useReceivePaymentParams } from "@/hooks/use-receive-payment-params";
import { useTRPC } from "@/trpc/client";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { Button } from "@school-clerk/ui/button";
import { Card } from "@school-clerk/ui/composite";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@school-clerk/ui/dropdown-menu";
import { Input } from "@school-clerk/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@school-clerk/ui/select";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	ArrowDownRight,
	ArrowRightLeft,
	ArrowUpRight,
	CreditCard,
	Ellipsis,
	Plus,
	Scale,
	Search,
	Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";

const money = new Intl.NumberFormat("en-NG", {
	style: "currency",
	currency: "NGN",
	maximumFractionDigits: 2,
});

function SummaryCard({
	label,
	value,
	helper,
	icon: Icon,
}: {
	label: string;
	value: number;
	helper: string;
	icon: typeof Wallet;
}) {
	return (
		<Card className="rounded-none shadow-none">
			<Card.Header className="flex flex-row items-start justify-between space-y-0 pb-2">
				<div>
					<Card.Title className="text-sm font-medium">{label}</Card.Title>
					<p className="mt-1 text-xs text-muted-foreground">{helper}</p>
				</div>
				<Icon className="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<p className="text-2xl font-semibold tracking-tight tabular-nums">
					{money.format(value)}
				</p>
			</Card.Content>
		</Card>
	);
}

export function FinanceWorkspace() {
	const trpc = useTRPC();
	const { filter, setFilter, hasFilters } = useFinanceWorkspaceParams();
	const { setParams } = useFinanceSheetParams();
	const { setParams: setReceivePaymentParams } = useReceivePaymentParams();
	const [visibleColumns, setVisibleColumns] = useState(defaultFinanceColumns);
	const { data: summary } = useSuspenseQuery(
		trpc.finance.getWorkspaceSummary.queryOptions({ period: filter.period }),
	);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
				event.preventDefault();
				document.getElementById("finance-account-search")?.focus();
			}
			if (event.key === "Escape" && hasFilters) {
				setFilter({ q: null, accountTypes: null, health: null });
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [hasFilters, setFilter]);

	return (
		<div className="space-y-6 px-4 py-6 sm:px-6">
			<header className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight">Finance</h1>
					<p className="max-w-2xl text-sm text-muted-foreground">
						Review cash movement, account balances, and upcoming obligations.
						All figures are calculated from the finance ledger.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						className="gap-2"
						onClick={() => setReceivePaymentParams({ receivePayment: true })}
					>
						<CreditCard className="h-4 w-4" />
						Receive payment
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="outline"
								size="icon"
								aria-label="More finance actions"
							>
								<Ellipsis className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-56">
							<DropdownMenuItem
								onSelect={() => setParams({ createFinanceAccount: true })}
							>
								<Plus className="mr-2 h-4 w-4" />
								Create account
							</DropdownMenuItem>
							<DropdownMenuItem
								onSelect={() => setParams({ transferFunds: true })}
							>
								<ArrowRightLeft className="mr-2 h-4 w-4" />
								Transfer funds
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<Link href="/finance/payables">Review payables</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link href="/finance/reconciliation">Reconciliation</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link href="/finance/setup/fees">Fee structures</Link>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</header>

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<SummaryCard
					label="Money In"
					value={summary.moneyIn}
					helper={`External inflow · ${summary.periodLabel}`}
					icon={ArrowUpRight}
				/>
				<SummaryCard
					label="Money Out"
					value={summary.moneyOut}
					helper={`External outflow · ${summary.periodLabel}`}
					icon={ArrowDownRight}
				/>
				<SummaryCard
					label="Net Movement"
					value={summary.netMovement}
					helper="Money in less money out"
					icon={Scale}
				/>
				<SummaryCard
					label="Ledger Balance"
					value={summary.ledgerBalance}
					helper="Includes transfers and opening adjustments"
					icon={Wallet}
				/>
			</div>

			<div className="grid gap-3 border bg-muted/20 p-4 text-sm sm:grid-cols-3">
				<div>
					<p className="text-xs text-muted-foreground">Pending payables</p>
					<p className="mt-1 font-medium tabular-nums">
						{money.format(summary.pendingPayables)}
					</p>
				</div>
				<div>
					<p className="text-xs text-muted-foreground">Student outstanding</p>
					<p className="mt-1 font-medium tabular-nums">
						{money.format(summary.studentOutstanding)}
					</p>
				</div>
				<div>
					<p className="text-xs text-muted-foreground">
						Accounts needing attention
					</p>
					<p className="mt-1 font-medium">
						{summary.needsAttentionCount} of {summary.accountCount}
					</p>
				</div>
			</div>

			<section className="space-y-3">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<h2 className="font-medium">Accounts</h2>
						<p className="text-xs text-muted-foreground">
							Balance is read-only. Record payments, expenses, or transfers to
							change it.
						</p>
					</div>
					<div className="flex flex-col gap-2 sm:flex-row">
						<div className="relative min-w-64">
							<Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								id="finance-account-search"
								className="pl-9"
								placeholder="Search accounts…"
								value={filter.q ?? ""}
								onChange={(event) =>
									setFilter({ q: event.target.value || null })
								}
							/>
						</div>
						<Select
							value={filter.period}
							onValueChange={(period) =>
								setFilter({ period: period as "term" | "session" | "all" })
							}
						>
							<SelectTrigger className="w-full sm:w-40">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="term">This term</SelectItem>
								<SelectItem value="session">This session</SelectItem>
								<SelectItem value="all">All time</SelectItem>
							</SelectContent>
						</Select>
						<Select
							value={filter.accountTypes?.[0] ?? "all"}
							onValueChange={(value) =>
								setFilter({
									accountTypes:
										value === "all" ? null : [value as "CREDIT" | "DEBIT"],
								})
							}
						>
							<SelectTrigger className="w-full sm:w-40">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All account types</SelectItem>
								<SelectItem value="CREDIT">Incoming</SelectItem>
								<SelectItem value="DEBIT">Outgoing</SelectItem>
							</SelectContent>
						</Select>
						<Select
							value={filter.health?.[0] ?? "all"}
							onValueChange={(value) =>
								setFilter({
									health:
										value === "all"
											? null
											: [
													value as
														| "healthy"
														| "needs_funding"
														| "deficit"
														| "no_activity",
												],
								})
							}
						>
							<SelectTrigger className="w-full sm:w-44">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All health states</SelectItem>
								<SelectItem value="healthy">Healthy</SelectItem>
								<SelectItem value="needs_funding">Needs funding</SelectItem>
								<SelectItem value="deficit">Deficit</SelectItem>
								<SelectItem value="no_activity">No activity</SelectItem>
							</SelectContent>
						</Select>
						<FinanceColumnVisibility
							visible={visibleColumns}
							setVisible={setVisibleColumns}
						/>
					</div>
				</div>
				<FinanceWorkspaceTable visible={visibleColumns} />
			</section>
		</div>
	);
}
