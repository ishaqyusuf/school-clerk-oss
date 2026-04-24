"use client";

import { PageItem } from "@/actions/get-transactions";
import { AnimatedNumber } from "@/components/animated-number";
import { studentDisplayName } from "@/utils/utils";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@school-clerk/ui/badge";
import { cn } from "@school-clerk/ui/cn";
import { ArrowDownLeft, ArrowUpRight, CalendarDays } from "lucide-react";

export type Item = PageItem;
export const columns: ColumnDef<Item>[] = [
  {
    header: "Transaction details",
    accessorKey: "billable",
    cell: ({ row: { original: item } }) => (
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl",
              item.type === "credit"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-600",
            )}
          >
            {item.type === "credit" ? (
              <ArrowDownLeft className="h-4 w-4" />
            ) : (
              <ArrowUpRight className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-foreground">
              {studentDisplayName(item.student) || "System"}
            </div>
            <div className="truncate text-sm text-muted-foreground">
              {[item.billTerm?.title, item.billTerm?.session?.title]
                .filter(Boolean)
                .join(" ")
                || "General transaction"}
            </div>
          </div>
        </div>
        <div className="inline-flex gap-1 pl-12 text-xs text-muted-foreground">
          <span className="font-mono text-primary/80">
            {item.id?.slice(0, 8).toUpperCase()}
          </span>
          <span>•</span>
          <span>{item.type === "credit" ? "Incoming" : "Outgoing"}</span>
        </div>
      </div>
    ),
  },
  {
    header: "Session window",
    accessorKey: "term",
    cell: ({ row: { original: item } }) => (
      <div className="space-y-1">
        <div className="font-semibold text-foreground">
          {item.invoiceTerm?.session?.title || "Current session"}
        </div>
        <div className="text-sm text-muted-foreground">
          {item?.invoiceTerm?.title || "Current term"}
        </div>
      </div>
    ),
  },
  {
    header: "Amount",
    accessorKey: "amount",
    meta: {
      className: "w-16",
    },
    cell: ({ row: { original: item } }) => (
      <div
        className={cn(
          item.amount > 0 ? "text-emerald-700" : "text-rose-700",
          "font-mono text-sm font-semibold",
        )}
      >
        <span className="mr-1">{item.amount > 0 ? "+" : "-"}</span>
        <AnimatedNumber value={item.amount} />
      </div>
    ),
  },
  {
    header: "Date",
    accessorKey: "createdAt",
    cell: ({ row: { original: item } }) => (
      <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="h-4 w-4" />
        <span>
          {item.createdAt ? format(new Date(item.createdAt), "MMM dd, yyyy") : "-"}
        </span>
      </div>
    ),
  },
  {
    header: "Type",
    accessorKey: "type",
    cell: ({ row: { original: item } }) => (
      <Badge
        variant={item.type === "credit" ? "default" : "outline"}
        className={cn(
          item.type === "credit" &&
            "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
          item.type === "transfer-out" && "border-orange-200 text-orange-600",
          item.type === "debit" && "border-slate-200 text-slate-700",
        )}
      >
        {item.type}
      </Badge>
    ),
  },
];
