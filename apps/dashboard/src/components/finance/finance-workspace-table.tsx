"use client";

import { BottomBar } from "@/components/tables/core";
import { useFinanceSheetParams } from "@/hooks/use-finance-sheet-params";
import { useFinanceWorkspaceParams } from "@/hooks/use-finance-workspace-params";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { cn } from "@school-clerk/ui/cn";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@school-clerk/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@school-clerk/ui/table";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
	ArrowDown,
	ArrowUp,
	ChevronDown,
	Download,
	Eye,
	MoreHorizontal,
	RefreshCcw,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

export type FinanceAccount =
	RouterOutputs["finance"]["getAccounts"]["data"][number];

type AccountsPage = RouterOutputs["finance"]["getAccounts"];
type SortField =
	| "name"
	| "accountType"
	| "moneyIn"
	| "moneyOut"
	| "ledgerBalance"
	| "pendingObligations"
	| "projectedBalance"
	| "health"
	| "lastActivityAt";

const money = new Intl.NumberFormat("en-NG", {
	style: "currency",
	currency: "NGN",
	maximumFractionDigits: 2,
});

const columnLabels = {
	accountType: "Type",
	moneyIn: "Money In",
	moneyOut: "Money Out",
	ledgerBalance: "Ledger Balance",
	pendingObligations: "Pending Obligations",
	projectedBalance: "Projected Balance",
	health: "Health",
	lastActivityAt: "Last Activity",
} as const;

function healthLabel(value: FinanceAccount["health"]) {
	switch (value) {
		case "needs_funding":
			return "Needs funding";
		case "no_activity":
			return "No activity";
		case "deficit":
			return "Deficit";
		default:
			return "Healthy";
	}
}

function HealthBadge({ value }: { value: FinanceAccount["health"] }) {
	return (
		<Badge
			variant={
				value === "healthy"
					? "success"
					: value === "no_activity"
						? "outline"
						: "warning"
			}
			className={cn(
				"whitespace-nowrap rounded-none",
				value === "deficit" && "border-rose-300 text-rose-700",
			)}
		>
			{healthLabel(value)}
		</Badge>
	);
}

function SortButton({
	field,
	children,
}: {
	field: SortField;
	children: React.ReactNode;
}) {
	const { filter, setFilter } = useFinanceWorkspaceParams();
	const active = filter.sortField === field;

	return (
		<button
			type="button"
			className="inline-flex items-center gap-1 text-left text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-300"
			onClick={() =>
				setFilter({
					sortField: field,
					sortDirection:
						active && filter.sortDirection === "asc" ? "desc" : "asc",
				})
			}
		>
			{children}
			{active ? (
				filter.sortDirection === "asc" ? (
					<ArrowUp className="h-3 w-3" />
				) : (
					<ArrowDown className="h-3 w-3" />
				)
			) : null}
		</button>
	);
}

function RowActions({ account }: { account: FinanceAccount }) {
	const { setParams } = useFinanceSheetParams();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8"
					aria-label={`Actions for ${account.name}`}
				>
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					onSelect={() => setParams({ financeAccountId: account.id })}
				>
					<Eye className="mr-2 h-4 w-4" />
					View account
				</DropdownMenuItem>
				<DropdownMenuItem
					onSelect={() =>
						setParams({
							transferFunds: true,
							transferFromAccountId: account.id,
						})
					}
				>
					<RefreshCcw className="mr-2 h-4 w-4" />
					Transfer from
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onSelect={() =>
						navigator.clipboard.writeText(
							`${location.origin}/finance/accounts/${account.id}`,
						)
					}
				>
					Copy statement link
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function FinanceColumnVisibility({
	visible,
	setVisible,
}: {
	visible: Record<keyof typeof columnLabels, boolean>;
	setVisible: React.Dispatch<
		React.SetStateAction<Record<keyof typeof columnLabels, boolean>>
	>;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="gap-2">
					Columns
					<ChevronDown className="h-3.5 w-3.5" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-52">
				{Object.entries(columnLabels).map(([key, label]) => (
					<DropdownMenuCheckboxItem
						key={key}
						checked={visible[key as keyof typeof columnLabels]}
						onCheckedChange={(checked) =>
							setVisible((current) => ({
								...current,
								[key]: Boolean(checked),
							}))
						}
					>
						{label}
					</DropdownMenuCheckboxItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function FinanceWorkspaceTable({
	visible,
}: {
	visible: Record<keyof typeof columnLabels, boolean>;
}) {
	const trpc = useTRPC();
	const { filter, hasFilters, setFilter } = useFinanceWorkspaceParams();
	const { setParams } = useFinanceSheetParams();
	const deferredSearch = useDeferredValue(filter.q);
	const loadMoreRef = useRef<HTMLDivElement>(null);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const queryInput = {
		period: filter.period,
		q: deferredSearch,
		accountTypes: filter.accountTypes ?? [],
		health: filter.health ?? [],
		sortField: filter.sortField,
		sortDirection: filter.sortDirection,
	};
	const options = trpc.finance.getAccounts.infiniteQueryOptions(queryInput, {
		getNextPageParam: ({ meta }) => meta.cursor,
	});
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useSuspenseInfiniteQuery<AccountsPage>(options as never);
	const accounts = useMemo(
		() => data.pages.flatMap((page) => page.data),
		[data.pages],
	);

	useEffect(() => {
		const node = loadMoreRef.current;
		if (!node || !hasNextPage) return;
		const observer = new IntersectionObserver((entries) => {
			if (entries[0]?.isIntersecting && !isFetchingNextPage) {
				fetchNextPage();
			}
		});
		observer.observe(node);
		return () => observer.disconnect();
	}, [fetchNextPage, hasNextPage, isFetchingNextPage]);

	const allSelected =
		accounts.length > 0 &&
		accounts.every((account) => selected.has(account.id));
	const toggleAll = () =>
		setSelected(
			allSelected ? new Set() : new Set(accounts.map((account) => account.id)),
		);
	const exportSelected = () => {
		const selectedRows = accounts.filter((account) => selected.has(account.id));
		const csv = [
			[
				"Account",
				"Type",
				"Money In",
				"Money Out",
				"Ledger Balance",
				"Pending Obligations",
				"Projected Balance",
				"Health",
			],
			...selectedRows.map((account) => [
				account.name,
				account.accountType,
				account.moneyIn,
				account.moneyOut,
				account.ledgerBalance,
				account.pendingObligations,
				account.projectedBalance,
				healthLabel(account.health),
			]),
		]
			.map((row) => row.map((value) => JSON.stringify(value)).join(","))
			.join("\n");
		const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
		const link = document.createElement("a");
		link.href = url;
		link.download = "finance-accounts.csv";
		link.click();
		URL.revokeObjectURL(url);
	};

	if (accounts.length === 0) {
		return (
			<div className="flex min-h-72 flex-col items-center justify-center gap-3 border border-dashed bg-background p-8 text-center">
				<h2 className="font-medium">
					{hasFilters ? "No matching accounts" : "No finance accounts"}
				</h2>
				<p className="max-w-md text-sm text-muted-foreground">
					{hasFilters
						? "Try another search or clear the account filters."
						: "Create an account to begin tracking ledger-backed finance activity."}
				</p>
				<Button
					variant="outline"
					onClick={() =>
						hasFilters
							? setFilter({ q: null, accountTypes: null, health: null })
							: setParams({ createFinanceAccount: true })
					}
				>
					{hasFilters ? "Clear filters" : "Create account"}
				</Button>
			</div>
		);
	}

	return (
		<>
			<div className="hidden overflow-auto border md:block">
				<Table className="min-w-[1180px]">
					<TableHeader className="sticky top-0 z-10 bg-sidebar-accent">
						<TableRow className="hover:bg-transparent">
							<TableHead className="w-12">
								<Checkbox
									checked={allSelected}
									onCheckedChange={toggleAll}
									aria-label="Select all accounts"
								/>
							</TableHead>
							<TableHead className="sticky left-0 min-w-60 bg-sidebar-accent">
								<SortButton field="name">Account</SortButton>
							</TableHead>
							{visible.accountType && (
								<TableHead>
									<SortButton field="accountType">Type</SortButton>
								</TableHead>
							)}
							{visible.moneyIn && (
								<TableHead>
									<SortButton field="moneyIn">Money In</SortButton>
								</TableHead>
							)}
							{visible.moneyOut && (
								<TableHead>
									<SortButton field="moneyOut">Money Out</SortButton>
								</TableHead>
							)}
							{visible.ledgerBalance && (
								<TableHead>
									<SortButton field="ledgerBalance">Ledger Balance</SortButton>
								</TableHead>
							)}
							{visible.pendingObligations && (
								<TableHead>
									<SortButton field="pendingObligations">Pending</SortButton>
								</TableHead>
							)}
							{visible.projectedBalance && (
								<TableHead>
									<SortButton field="projectedBalance">Projected</SortButton>
								</TableHead>
							)}
							{visible.health && (
								<TableHead>
									<SortButton field="health">Health</SortButton>
								</TableHead>
							)}
							{visible.lastActivityAt && (
								<TableHead>
									<SortButton field="lastActivityAt">Last Activity</SortButton>
								</TableHead>
							)}
							<TableHead className="w-14 text-center">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{accounts.map((account) => (
							<TableRow
								key={account.id}
								className="cursor-pointer"
								onClick={() => setParams({ financeAccountId: account.id })}
							>
								<TableCell onClick={(event) => event.stopPropagation()}>
									<Checkbox
										checked={selected.has(account.id)}
										onCheckedChange={(checked) =>
											setSelected((current) => {
												const next = new Set(current);
												checked
													? next.add(account.id)
													: next.delete(account.id);
												return next;
											})
										}
										aria-label={`Select ${account.name}`}
									/>
								</TableCell>
								<TableCell className="sticky left-0 bg-background group-hover:bg-muted">
									<p className="font-medium">{account.name}</p>
									<p className="max-w-56 truncate text-xs text-muted-foreground">
										{account.description ||
											(account.isSystem ? "System account" : "Custom account")}
									</p>
								</TableCell>
								{visible.accountType && (
									<TableCell>
										<Badge variant="outline" className="rounded-none">
											{account.accountType === "CREDIT"
												? "Incoming"
												: "Outgoing"}
										</Badge>
									</TableCell>
								)}
								{visible.moneyIn && (
									<TableCell className="tabular-nums">
										{money.format(account.moneyIn)}
									</TableCell>
								)}
								{visible.moneyOut && (
									<TableCell className="tabular-nums">
										{money.format(account.moneyOut)}
									</TableCell>
								)}
								{visible.ledgerBalance && (
									<TableCell className="font-medium tabular-nums">
										{money.format(account.ledgerBalance)}
									</TableCell>
								)}
								{visible.pendingObligations && (
									<TableCell className="tabular-nums">
										{money.format(account.pendingObligations)}
									</TableCell>
								)}
								{visible.projectedBalance && (
									<TableCell
										className={cn(
											"font-medium tabular-nums",
											account.projectedBalance < 0 && "text-rose-700",
										)}
									>
										{money.format(account.projectedBalance)}
									</TableCell>
								)}
								{visible.health && (
									<TableCell>
										<HealthBadge value={account.health} />
									</TableCell>
								)}
								{visible.lastActivityAt && (
									<TableCell className="text-muted-foreground">
										{account.lastActivityAt
											? format(new Date(account.lastActivityAt), "dd MMM yyyy")
											: "No activity"}
									</TableCell>
								)}
								<TableCell onClick={(event) => event.stopPropagation()}>
									<RowActions account={account} />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<div className="grid gap-3 md:hidden">
				{accounts.map((account) => (
					<button
						key={account.id}
						type="button"
						className="space-y-4 border bg-background p-4 text-left"
						onClick={() => setParams({ financeAccountId: account.id })}
					>
						<div className="flex items-start justify-between gap-3">
							<div>
								<p className="font-medium">{account.name}</p>
								<p className="text-xs text-muted-foreground">
									{account.accountType === "CREDIT" ? "Incoming" : "Outgoing"}{" "}
									account
								</p>
							</div>
							<HealthBadge value={account.health} />
						</div>
						<div className="grid grid-cols-2 gap-3 text-sm">
							<div>
								<p className="text-xs text-muted-foreground">Ledger balance</p>
								<p className="font-medium tabular-nums">
									{money.format(account.ledgerBalance)}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Projected</p>
								<p
									className={cn(
										"font-medium tabular-nums",
										account.projectedBalance < 0 && "text-rose-700",
									)}
								>
									{money.format(account.projectedBalance)}
								</p>
							</div>
						</div>
					</button>
				))}
			</div>

			<div ref={loadMoreRef} className="h-2" />
			{isFetchingNextPage ? (
				<p className="py-3 text-center text-xs text-muted-foreground">
					Loading more accounts…
				</p>
			) : null}

			{selected.size > 0 ? (
				<BottomBar
					selectedCount={selected.size}
					onDeselect={() => setSelected(new Set())}
				>
					<Button variant="ghost" onClick={exportSelected} className="gap-2">
						<Download className="h-4 w-4" />
						Export
					</Button>
					<Button variant="ghost" asChild>
						<Link
							href={`/finance/reconciliation?accountIds=${Array.from(selected).join(",")}`}
						>
							Reconcile
						</Link>
					</Button>
				</BottomBar>
			) : null}
		</>
	);
}

export const defaultFinanceColumns: Record<keyof typeof columnLabels, boolean> =
	{
		accountType: true,
		moneyIn: true,
		moneyOut: true,
		ledgerBalance: true,
		pendingObligations: true,
		projectedBalance: true,
		health: true,
		lastActivityAt: true,
	};
