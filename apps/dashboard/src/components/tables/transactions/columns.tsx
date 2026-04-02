"use client";

import { PageItem } from "@/actions/get-transactions";
import { AnimatedNumber } from "@/components/animated-number";
import { studentDisplayName } from "@/utils/utils";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@school-clerk/ui/badge";
import { cn } from "@school-clerk/ui/cn";

export type Item = PageItem;
export const columns: ColumnDef<Item>[] = [
  {
    header: "Transaction",
    accessorKey: "billable",
    cell: ({ row: { original: item } }) => (
      <div>
        <div className="flex gap-2">
          <span className="font-bold">
            {studentDisplayName(item.student) || "System"}
          </span>
        </div>

        <div className="inline-flex gap-1 text-muted-foreground">
          <span>{item.id?.slice(0, 8).toUpperCase()}</span>
          <span>-</span>
          <span>
            {[item.billTerm?.title, item.billTerm?.session?.title]
              .filter(Boolean)
              .join(" ")}
          </span>
        </div>
      </div>
    ),
  },
  {
    header: "Term",
    accessorKey: "term",
    cell: ({ row: { original: item } }) => (
      <div>
        <div className="font-bold">{item.invoiceTerm?.session?.title}</div>
        <div className="text-sm">{item?.invoiceTerm?.title}</div>
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
          item.amount > 0 ? "text-green-700" : "text-red-700",
          "font-mono",
        )}
      >
        <AnimatedNumber value={item.amount} />
      </div>
    ),
  },
  {
    header: "Date",
    accessorKey: "createdAt",
    cell: ({ row: { original: item } }) =>
      item.createdAt ? format(new Date(item.createdAt), "MMM dd, yyyy") : "-",
  },
  {
    header: "Type",
    accessorKey: "type",
    cell: ({ row: { original: item } }) => (
      <Badge
        variant={item.type === "credit" ? "default" : "outline"}
        className={cn(
          item.type === "credit" &&
            "bg-green-100 text-green-700 hover:bg-green-100",
          item.type === "transfer-out" && "border-orange-200 text-orange-600"
        )}
      >
        {item.type}
      </Badge>
    ),
  },
];
