"use client";

import { FinanceNewMenu } from "@/components/finance/finance-page-actions";
import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { Card } from "@school-clerk/ui/composite";
import { cn } from "@school-clerk/ui/cn";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	ArrowRight,
	CalendarClock,
	ChevronRight,
	ClipboardCheck,
	Inbox,
	TriangleAlert,
	Wallet,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";

const money = new Intl.NumberFormat("en-NG", {
	style: "currency",
	currency: "NGN",
	maximumFractionDigits: 0,
});

const dayFormat = new Intl.DateTimeFormat("en-NG", {
	day: "numeric",
	month: "short",
});

function plural(count: number, one: string, many = `${one}s`) {
	return `${count} ${count === 1 ? one : many}`;
}

function Stat({
	label,
	value,
	hint,
	tone,
	href,
}: {
	label: string;
	value: number;
	hint: string;
	tone?: "success" | "warning" | "danger";
	href?: string;
}) {
	const body = (
		<>
			<span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
				{label}
			</span>
			<span className="font-semibold text-2xl tabular-nums tracking-tight">
				{money.format(value)}
			</span>
			<span
				className={cn(
					"flex items-center gap-1 text-xs",
					tone === "success" && "text-emerald-700 dark:text-emerald-400",
					tone === "warning" && "text-amber-700 dark:text-amber-400",
					tone === "danger" && "text-red-700 dark:text-red-400",
					!tone && "text-muted-foreground",
				)}
			>
				{hint}
				{href ? <ArrowRight className="ml-auto h-3.5 w-3.5" /> : null}
			</span>
		</>
	);
	const className =
		"flex flex-col gap-1.5 rounded-md border bg-card p-4 text-left transition-colors";
	return href ? (
		<Link href={href} className={cn(className, "hover:bg-accent/40")}>
			{body}
		</Link>
	) : (
		<div className={className}>{body}</div>
	);
}

type Attention = {
	href: string;
	icon: ComponentType<{ className?: string }>;
	tone: "danger" | "warning" | "info";
	title: string;
	detail: string;
};

const toneClass: Record<Attention["tone"], string> = {
	danger: "bg-red-500/10 text-red-700 dark:text-red-400",
	warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
	info: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
};

const payerLabel: Record<string, string> = {
	STUDENT: "Student payment",
	STAFF: "Salary",
	SCHOOL: "Bill or purchase",
};

export function FinanceHome() {
	const trpc = useTRPC();
	const { role } = useAuth();
	const isAdmin = (role ?? "").toLowerCase() === "admin";
	const { data: summary } = useSuspenseQuery(
		trpc.finance.getHomeSummary.queryOptions(),
	);
	const { data: workspace } = useSuspenseQuery(
		trpc.finance.getWorkspaceSummary.queryOptions({ period: "term" }),
	);

	const attention: Attention[] = [];
	if (summary.billsToPay.count > 0) {
		attention.push({
			href: "/finance/services/unpaid",
			icon: TriangleAlert,
			tone: "danger",
			title: `${plural(summary.billsToPay.count, "bill")} not paid yet`,
			detail: `${money.format(summary.billsToPay.amount)} owed to suppliers`,
		});
	}
	if (summary.salariesDue.count > 0) {
		attention.push({
			href: "/finance/salaries",
			icon: CalendarClock,
			tone: "warning",
			title: `${plural(summary.salariesDue.count, "salary", "salaries")} to pay`,
			detail: money.format(summary.salariesDue.amount),
		});
	}
	if (workspace.needsAttentionCount > 0) {
		attention.push({
			href: isAdmin ? "/finance/accounts" : "/finance/accounts/transfers",
			icon: Wallet,
			tone: "warning",
			title: `${plural(workspace.needsAttentionCount, "account")} need funding`,
			detail: "Balance is below what is owed from it",
		});
	}
	if (workspace.reconciliationIssueCount > 0) {
		attention.push({
			href: "/finance/accounts/close-term",
			icon: ClipboardCheck,
			tone: "info",
			title: `${plural(workspace.reconciliationIssueCount, "record")} to check before closing the term`,
			detail: "Open Close term to review",
		});
	}

	return (
		<div className="flex flex-col gap-6 p-6">
			<header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
				<div>
					<h1 className="font-semibold text-2xl tracking-tight">Finance</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Money in and out, and what needs your attention.
					</p>
				</div>
				<FinanceNewMenu />
			</header>

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<Stat
					label="Collected today"
					value={summary.collectedToday.amount}
					hint={plural(summary.collectedToday.count, "payment")}
					tone="success"
				/>
				<Stat
					label="Students still owe"
					value={summary.studentsOwe.amount}
					hint={plural(summary.studentsOwe.count, "student")}
					href="/finance/student-payments/owing"
				/>
				<Stat
					label="Bills to pay"
					value={summary.billsToPay.amount}
					hint={
						summary.billsToPay.count
							? `${summary.billsToPay.count} unpaid`
							: "All paid"
					}
					tone={summary.billsToPay.count ? "danger" : "success"}
					href="/finance/services/unpaid"
				/>
				<Stat
					label="Salaries due"
					value={summary.salariesDue.amount}
					hint={
						summary.salariesDue.count
							? plural(summary.salariesDue.count, "salary", "salaries")
							: "All paid"
					}
					tone={summary.salariesDue.count ? "warning" : "success"}
					href="/finance/salaries"
				/>
			</div>

			<div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
				<Card className="rounded-md shadow-none">
					<Card.Header className="flex flex-row items-center justify-between space-y-0 border-b py-3">
						<Card.Title className="font-semibold text-sm">Latest activity</Card.Title>
						<Link
							href="/finance/accounts/transactions"
							className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
						>
							See all <ArrowRight className="h-3.5 w-3.5" />
						</Link>
					</Card.Header>
					<Card.Content className="p-0">
						{summary.recent.length ? (
							<ul className="divide-y">
								{summary.recent.map((row) => (
									<li key={row.id} className="flex items-center gap-3 px-4 py-2.5">
										<span className="w-14 shrink-0 text-muted-foreground text-xs">
											{dayFormat.format(new Date(row.paymentDate))}
										</span>
										<span className="min-w-0 flex-1">
											<span className="block truncate font-medium text-sm">{row.who}</span>
											<span className="block truncate text-muted-foreground text-xs">
												{[row.what, payerLabel[row.payerType] ?? row.payerType]
													.filter(Boolean)
													.join(" · ")}
											</span>
										</span>
										<span
											className={cn(
												"text-sm tabular-nums",
												row.payerType === "STUDENT" &&
													"text-emerald-700 dark:text-emerald-400",
											)}
										>
											{row.payerType === "STUDENT" ? "+" : "−"}
											{money.format(row.amount)}
										</span>
									</li>
								))}
							</ul>
						) : (
							<div className="flex flex-col items-center gap-2 py-10 text-muted-foreground text-sm">
								<Inbox className="h-5 w-5" />
								No payments yet.
							</div>
						)}
					</Card.Content>
				</Card>

				<Card className="rounded-md shadow-none">
					<Card.Header className="border-b py-3">
						<Card.Title className="font-semibold text-sm">Needs attention</Card.Title>
					</Card.Header>
					<Card.Content className="p-0">
						{attention.length ? (
							<ul className="divide-y">
								{attention.map((item) => (
									<li key={item.title}>
										<Link
											href={item.href}
											className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40"
										>
											<span
												className={cn(
													"grid h-8 w-8 shrink-0 place-items-center rounded-md",
													toneClass[item.tone],
												)}
											>
												<item.icon className="h-4 w-4" />
											</span>
											<span className="min-w-0 flex-1">
												<span className="block font-medium text-sm">{item.title}</span>
												<span className="block text-muted-foreground text-xs">
													{item.detail}
												</span>
											</span>
											<ChevronRight className="h-4 w-4 text-muted-foreground" />
										</Link>
									</li>
								))}
							</ul>
						) : (
							<p className="px-4 py-8 text-center text-muted-foreground text-sm">
								Nothing needs attention.
							</p>
						)}
					</Card.Content>
				</Card>
			</div>
		</div>
	);
}
