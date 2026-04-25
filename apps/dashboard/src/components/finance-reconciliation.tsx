"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { TableSkeleton } from "./tables/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@school-clerk/ui/card";
import { Button } from "@school-clerk/ui/button";
import { Badge } from "@school-clerk/ui/badge";
import { AnimatedNumber } from "./animated-number";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Layers,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

type ExportableSection =
  | "streams"
  | "payroll"
  | "servicePayments"
  | "collections"
  | "owingLedger";

export function FinanceReconciliation() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Content />
    </Suspense>
  );
}

function toCsv(rows: Array<Record<string, unknown>>) {
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
    ...rows.map((row) => headers.map((header) => escapeValue(row[header])).join(",")),
  ].join("\n");
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

function Content() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const { data: integrity } = useSuspenseQuery(
    trpc.finance.getFinanceIntegrityReport.queryOptions({})
  );
  const { data: reports } = useSuspenseQuery(
    trpc.finance.getFinanceReports.queryOptions({})
  );

  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: trpc.finance.getFinanceIntegrityReport.queryKey({}) }),
      qc.invalidateQueries({ queryKey: trpc.finance.getFinanceReports.queryKey({}) }),
      qc.invalidateQueries({ queryKey: trpc.finance.getStreams.queryKey({ filter: "term" }) }),
      qc.invalidateQueries({ queryKey: trpc.finance.getBillables.queryKey() }),
      qc.invalidateQueries({ queryKey: trpc.finance.getBills.queryKey() }),
      qc.invalidateQueries({ queryKey: trpc.finance.getPayroll.queryKey({ termId: undefined }) }),
      qc.invalidateQueries({ queryKey: trpc.finance.getServicePayments.queryKey({}) }),
      qc.invalidateQueries({ queryKey: trpc.finance.getCollectionSummary.queryKey({}) }),
    ]);

  const { mutate: backfillSettlements, isPending: backfilling } = useMutation(
    trpc.finance.backfillBillSettlements.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Backfilling settlements...",
          success: "Settlements backfilled",
          error: "Backfill failed",
        },
      },
      onSuccess: invalidate,
    })
  );

  const { mutate: generateBillables, isPending: generating } = useMutation(
    trpc.finance.generateBillsFromBillables.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Generating payables...",
          success: "Payables generated",
          error: "Generation failed",
        },
      },
      onSuccess: invalidate,
    })
  );

  const exportRows = useMemo(
    () => ({
      streams: reports.streams,
      payroll: reports.payroll,
      servicePayments: reports.servicePayments,
      collections: reports.collections,
      owingLedger: reports.owingLedger,
    }),
    [reports]
  );

  const exportSection = (section: ExportableSection) => {
    downloadCsv(`finance-${section}.csv`, exportRows[section] as Array<Record<string, unknown>>);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Finance Reconciliation</h1>
          <p className="mt-1 text-muted-foreground">
            Validate finance integrity, export canonical reports, and run finance maintenance actions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => backfillSettlements({})}
            disabled={backfilling}
          >
            <RefreshCw className="h-4 w-4" />
            Backfill Settlements
          </Button>
          <Button
            type="button"
            className="gap-2"
            onClick={() => generateBillables({})}
            disabled={generating}
          >
            <Layers className="h-4 w-4" />
            Generate Payables
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Available Funds"
          value={integrity.totals.streamAvailableFunds}
          tone="sky"
        />
        <MetricCard
          label="Pending Payables"
          value={integrity.totals.streamPendingBills}
          tone="amber"
        />
        <MetricCard
          label="Outstanding Owing"
          value={integrity.totals.streamOwing}
          tone="orange"
        />
        <MetricCard
          label="Pending Student Fees"
          value={integrity.totals.studentPendingFees}
          tone="rose"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Integrity Checks
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {integrity.checks.map((check: any) => (
            <div
              key={check.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{check.label}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{check.description}</div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    check.severity === "ok"
                      ? "border-green-200 bg-green-50 text-green-700"
                      : check.severity === "warning"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-rose-200 bg-rose-50 text-rose-700"
                  }
                >
                  {check.count}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <ExportCard
          title="Streams Report"
          description="Available funds, pending bills, owing, and projected balances."
          count={reports.streams.length}
          onExport={() => exportSection("streams")}
          href="/finance/streams"
        />
        <ExportCard
          title="Payroll Report"
          description="Gross, funded, and owing positions across payroll payables."
          count={reports.payroll.length}
          onExport={() => exportSection("payroll")}
          href="/staff/payroll"
        />
        <ExportCard
          title="Service Payments Report"
          description="Operational outgoing bills and settlement status."
          count={reports.servicePayments.length}
          onExport={() => exportSection("servicePayments")}
          href="/finance/payments"
        />
        <ExportCard
          title="Collections Report"
          description="Classroom-level billed, paid, and pending fee collections."
          count={reports.collections.length}
          onExport={() => exportSection("collections")}
          href="/finance/collections"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Owing Ledger</CardTitle>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => exportSection("owingLedger")}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          {reports.owingLedger.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No active or settled owing rows yet.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.owingLedger.slice(0, 12).map((row: any) => (
                <div
                  key={row.id}
                  className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="font-semibold">{row.title}</div>
                    <div className="text-sm text-muted-foreground">{row.streamName}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span>Requested: <AnimatedNumber value={row.requestedAmount} currency="NGN" /></span>
                    <span>Funded: <AnimatedNumber value={row.fundedAmount} currency="NGN" /></span>
                    <span>Owing: <AnimatedNumber value={row.owingAmount} currency="NGN" /></span>
                    <Badge variant="outline">{row.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mismatch Drilldown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MismatchBlock
            title="Legacy payments without settlement rows"
            rows={integrity.mismatches.legacyPaymentsWithoutSettlement}
          />
          <MismatchBlock
            title="Bills missing stream links"
            rows={integrity.mismatches.missingStreams}
          />
          <MismatchBlock
            title="Projected deficit streams"
            rows={integrity.mismatches.streamProjectedDeficits}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "sky" | "amber" | "orange" | "rose";
}) {
  const toneClass =
    tone === "sky"
      ? "text-sky-600"
      : tone === "amber"
        ? "text-amber-600"
        : tone === "orange"
          ? "text-orange-600"
          : "text-rose-600";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${toneClass}`}>
          <AnimatedNumber value={value} currency="NGN" />
        </div>
      </CardContent>
    </Card>
  );
}

function ExportCard({
  title,
  description,
  count,
  onExport,
  href,
}: {
  title: string;
  description: string;
  count: number;
  onExport: () => void;
  href: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="text-sm font-medium">{count} rows ready</div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onExport}>
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </Button>
          <Button asChild type="button" size="sm" variant="ghost">
            <Link href={href}>Open</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MismatchBlock({
  title,
  rows,
}: {
  title: string;
  rows: Array<Record<string, unknown>>;
}) {
  return (
    <div className="rounded-xl border border-border">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 font-semibold">
        {rows.length ? (
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        )}
        {title}
      </div>
      <div className="p-4">
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No mismatches found.</div>
        ) : (
          <pre className="overflow-x-auto text-xs text-muted-foreground">
            {JSON.stringify(rows.slice(0, 12), null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
