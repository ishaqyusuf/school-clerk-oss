"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { studentDisplayName } from "@/utils/utils";
import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
import { Card } from "@school-clerk/ui/card";
import { Search, Download } from "lucide-react";
import { Table } from "@school-clerk/ui/data-table";
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
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transaction Management</h1>
          <p className="text-sm text-muted-foreground">
            View, filter, and export financial transactions across all accounts.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" size="sm">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative md:col-span-2">
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
          <div>
            <select
              className="h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
              }}
            >
              <option value="all">All Types</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
              <option value="transfer-out">Transfer Out</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden border-border">
        {filtered.length ? (
          <TransactionsTable data={filtered} />
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
