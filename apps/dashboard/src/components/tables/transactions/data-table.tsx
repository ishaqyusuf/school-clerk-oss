"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { studentDisplayName } from "@/utils/utils";
import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@school-clerk/ui/card";
import { Badge } from "@school-clerk/ui/badge";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Download,
  Search,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Table } from "@school-clerk/ui/data-table";
import { cn } from "@school-clerk/ui/cn";
import { columns } from "./columns";

function TransactionsTable({ data }) {
  return (
    <Table.Provider
      args={[
        {
          columns,
          data,
        },
      ]}
    >
      <div className="overflow-x-auto">
        <Table>
          <Table.Header />
          <Table.Body>
            <Table.Row />
          </Table.Body>
        </Table>
      </div>
    </Table.Provider>
  );
}

export function DataTable() {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.finance.getTransactions.queryOptions());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = useMemo(() => {
    let result = data ?? [];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) => {
        const name = t.student ? studentDisplayName(t.student)?.toLowerCase() : "";
        const id = t.id?.toLowerCase() ?? "";
        return (name ?? "").includes(q) || id.includes(q);
      });
    }
    if (typeFilter !== "all") {
      result = result.filter((t) => t.type === typeFilter);
    }
    return result;
  }, [data, search, typeFilter]);

  const stats = useMemo(() => {
    const rows = data ?? [];
    const credits = rows.filter((item) => item.type === "credit");
    const debits = rows.filter((item) => item.type !== "credit");
    const creditVolume = credits.reduce(
      (total, item) => total + Math.abs(item.amount || 0),
      0,
    );
    const debitVolume = debits.reduce(
      (total, item) => total + Math.abs(item.amount || 0),
      0,
    );

    return {
      total: rows.length,
      credits: credits.length,
      debits: debits.length,
      creditVolume,
      debitVolume,
    };
  }, [data]);

  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <span>No transactions recorded yet.</span>
        <span>Transactions appear here when fees or bills are paid.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-3xl border-border shadow-sm">
        <CardHeader className="gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <Wallet className="h-3.5 w-3.5" />
                Transactions
              </div>
              <CardTitle className="text-2xl tracking-tight">
                Financial transaction management
              </CardTitle>
              <p className="max-w-2xl text-sm text-muted-foreground">
                View movement across fees and wallet activity, filter by transaction
                type, and export the current ledger view.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" size="sm">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total transactions"
              value={String(stats.total)}
              helper="Recorded wallet movements"
              icon={Wallet}
            />
            <StatCard
              label="Credits"
              value={String(stats.credits)}
              helper={`${formatAmount(stats.creditVolume)} in inflow`}
              icon={ArrowDownLeft}
              tone="success"
            />
            <StatCard
              label="Debits"
              value={String(stats.debits)}
              helper={`${formatAmount(stats.debitVolume)} in outflow`}
              icon={ArrowUpRight}
            />
            <StatCard
              label="Filtered view"
              value={String(filtered.length)}
              helper="Transactions matching current filters"
              icon={TrendingUp}
            />
          </div>
        </CardHeader>
      </Card>

      <Card className="rounded-2xl border-border p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.6fr_0.7fr_0.7fr]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name or transaction ID..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
            />
          </div>

          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <div className="flex h-10 items-center rounded-md border border-input bg-background pl-9 pr-3 text-sm text-muted-foreground">
              Current term
            </div>
          </div>

          <div>
            <select
              className="h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
              }}
            >
              <option value="all">All types</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
              <option value="transfer-out">Transfer out</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { label: "All transactions", value: "all" },
            { label: "Credits", value: "credit" },
            { label: "Debits", value: "debit" },
            { label: "Transfers", value: "transfer-out" },
          ].map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={typeFilter === option.value ? "default" : "outline"}
              onClick={() => setTypeFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
          {!!search && (
            <Badge variant="secondary" className="px-3 py-1">
              Search: {search}
            </Badge>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden rounded-3xl border-border shadow-sm">
        <CardHeader className="border-b border-border bg-muted/20">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg">Ledger</CardTitle>
              <p className="text-sm text-muted-foreground">
                Showing {filtered.length} transaction
                {filtered.length === 1 ? "" : "s"} from {data.length} records.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              Types in view:
              <span className="ml-2 font-medium text-foreground">
                {typeFilter === "all" ? "All" : typeFilter}
              </span>
            </div>
          </div>
        </CardHeader>
        {filtered.length ? (
          <CardContent className="p-0">
            <TransactionsTable data={filtered} />
          </CardContent>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No transactions found matching your filters.
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border p-4">
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} transaction{filtered.length === 1 ? "" : "s"}
          </p>
          <div className="text-xs text-muted-foreground">Filtered from {data.length}</div>
        </div>
      </Card>
    </div>
  );
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof Wallet;
  tone?: "default" | "success";
}) {
  return (
    <Card className="rounded-2xl border-border shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
          </div>
          <div
            className={cn(
              "rounded-xl p-2",
              tone === "success"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-primary/10 text-primary",
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
