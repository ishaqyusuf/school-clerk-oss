"use client";

import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { CheckCircle2, Download, ShieldCheck, TriangleAlert } from "lucide-react";
import { useMemo } from "react";
import { NumberInput } from "@/components/currency-input";
import { DataTable as FinanceStreamsTable } from "@/components/tables/finance-streams/data-table";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";

type ExportRow = Record<string, unknown>;

function toCsv(rows: ExportRow[]) {
	if (!rows.length) return "";
	const headers = Object.keys(rows[0]);
	const escapeValue = (value: unknown) => {
		const raw = value == null ? "" : String(value);
		if (raw.includes(",") || raw.includes('"') || raw.includes("\n")) {
			return `"${raw.replace(/"/g, '""')}"`;
		}

		return raw;
	};

	return [
		headers.join(","),
		...rows.map((row) =>
			headers.map((header) => escapeValue(row[header])).join(","),
		),
	].join("\n");
}

function downloadCsv(filename: string, rows: ExportRow[]) {
	const href = URL.createObjectURL(
		new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" }),
	);
	const link = document.createElement("a");
	link.href = href;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(href);
}

function MetricCard({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-md border bg-background p-4">
			<p className="text-muted-foreground text-sm">{label}</p>
			<p className="mt-3 text-2xl font-semibold">
				<NumberInput value={value} prefix="NGN " />
			</p>
		</div>
	);
}

export function FinanceReconciliationView() {
	const trpc = useTRPC();
	const { data: integrity } = useSuspenseQuery(
		trpc.finance.getFinanceIntegrityReport.queryOptions({}),
	);
	const { data: reports } = useSuspenseQuery(
		trpc.finance.getFinanceReports.queryOptions({}),
	);
	const exportRows = useMemo(
		() =>
			reports.streams.map((stream) => ({
				name: stream.name,
				type: stream.accountType,
				credit: stream.credit,
				debit: stream.debit,
				balance: stream.balance,
				activeCharges: stream.activeBillablesCount,
			})),
		[reports.streams],
	);

	return (
		<div className="space-y-6 p-6">
			<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Finance Reconciliation
					</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Integrity checks and exportable account balances from the standardized ledger.
					</p>
				</div>
				<Button
					variant="outline"
					className="gap-2"
					onClick={() => downloadCsv("finance-streams.csv", exportRows)}
				>
					<Download className="h-4 w-4" />
					Export Accounts
				</Button>
			</div>

			<div className="hidden gap-3 md:grid md:grid-cols-3">
				<MetricCard label="Credits" value={integrity.totals.totalCredit} />
				<MetricCard label="Debits" value={integrity.totals.totalDebit} />
				<MetricCard label="Balance" value={integrity.totals.totalBalance} />
			</div>

			<div className="rounded-md border bg-background">
				<div className="flex items-center gap-2 border-b px-4 py-3">
					<ShieldCheck className="h-4 w-4 text-muted-foreground" />
					<div>
						<h2 className="font-medium text-sm">Integrity Checks</h2>
						<p className="text-muted-foreground text-xs">
							Checks run against ledger-backed finance accounts.
						</p>
					</div>
				</div>
				<div className="grid gap-3 p-4 md:grid-cols-2">
					{integrity.checks.map((check) => {
						const isOk = check.status === "ok";

						return (
							<div key={check.key} className="rounded-md border p-4">
								<div className="flex items-start justify-between gap-3">
									<div className="flex items-start gap-3">
										{isOk ? (
											<CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
										) : (
											<TriangleAlert className="mt-0.5 h-4 w-4 text-amber-600" />
										)}
										<div>
											<p className="font-medium text-sm">{check.label}</p>
											<p className="mt-1 text-muted-foreground text-xs">
												{check.message}
											</p>
										</div>
									</div>
									<Badge
										variant={isOk ? "success" : "warning"}
										className="rounded-none"
									>
										{check.status}
									</Badge>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			<FinanceStreamsTable data={reports.streams} />
		</div>
	);
}
