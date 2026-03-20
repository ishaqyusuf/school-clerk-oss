"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { studentDisplayName } from "@/utils/utils";
import { Button } from "@school-clerk/ui/button";
import { Badge } from "@school-clerk/ui/badge";
import { Input } from "@school-clerk/ui/input";
import { Card } from "@school-clerk/ui/card";
import {
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Printer,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { format } from "date-fns";

export function PageTable() {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.finance.getTransactions.queryOptions());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(0);
  const pageSize = 20;

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

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-2">
        <span>No transactions recorded yet.</span>
        <span>Transactions appear here when fees or bills are paid.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transaction Management</h1>
          <p className="text-muted-foreground text-sm">
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

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name or transaction ID..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
          <div>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none cursor-pointer"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
            >
              <option value="all">All Types</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
              <option value="transfer-out">Transfer Out</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30 border-b border-border text-muted-foreground font-medium">
              <tr>
                <th className="p-4 whitespace-nowrap">Transaction Details</th>
                <th className="p-4 whitespace-nowrap">Term</th>
                <th className="p-4 whitespace-nowrap">Date</th>
                <th className="p-4 whitespace-nowrap text-right">Amount</th>
                <th className="p-4 whitespace-nowrap text-center">Type</th>
                <th className="p-4 whitespace-nowrap text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.map((txn) => {
                const isCredit = txn.type === "credit";
                const studentName = txn.student ? studentDisplayName(txn.student) : null;
                return (
                  <tr key={txn.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                          isCredit
                            ? "bg-green-100 dark:bg-green-900/20 text-green-600"
                            : "bg-rose-100 dark:bg-rose-900/20 text-rose-600"
                        }`}>
                          {isCredit
                            ? <ArrowUpRight className="h-4 w-4" />
                            : <ArrowDownLeft className="h-4 w-4" />
                          }
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            {studentName || "System"}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {txn.id.slice(0, 8).toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <div className="font-medium">{txn.invoiceTerm?.session?.title}</div>
                        <div className="text-xs text-muted-foreground">{txn.invoiceTerm?.title}</div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">
                      {txn.createdAt ? format(new Date(txn.createdAt), "MMM dd, yyyy") : "-"}
                    </td>
                    <td className="p-4 text-right">
                      <div className={`font-bold ${isCredit ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>
                        {isCredit ? "+" : "-"}
                        <AnimatedNumber value={txn.amount ?? 0} currency="NGN" />
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center">
                        {isCredit && (
                          <Badge className="gap-1 pl-1 pr-2 bg-green-100 text-green-700 border-green-200">
                            <CheckCircle2 className="h-3 w-3" /> Credit
                          </Badge>
                        )}
                        {txn.type === "debit" && (
                          <Badge variant="outline" className="gap-1 pl-1 pr-2">
                            <XCircle className="h-3 w-3" /> Debit
                          </Badge>
                        )}
                        {txn.type === "transfer-out" && (
                          <Badge variant="outline" className="gap-1 pl-1 pr-2 text-orange-600">
                            <Clock className="h-3 w-3" /> Transfer
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="Print Receipt"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                    No transactions found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {Math.min(page * pageSize + 1, filtered.length)}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length} transactions
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
