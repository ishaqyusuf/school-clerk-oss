"use client";

import { PageItem } from "@/actions/get-student-fees";
import { AnimatedNumber } from "@/components/animated-number";
import { NumberInput } from "@/components/currency-input";
import { ColumnDef } from "@tanstack/react-table";

import { cn } from "@school-clerk/ui/cn";

export type Item = PageItem;
export const columns: ColumnDef<Item>[] = [
  {
    header: "Transaction",
    accessorKey: "billable",
    cell: ({ row: { original: item } }) => (
      <div>
        <div>{item?.studentName}</div>
        <div className="font-bold">{item.feeTitle}</div>
        <div className="">{item.description}</div>
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
          // item.billAmount > 0 ? "text-green-700" : "text-red-700",
          "font-mono",
        )}
      >
        <AnimatedNumber value={item.billAmount} />
      </div>
    ),
  },
  {
    header: "Pending",
    accessorKey: "pending",
    meta: {
      className: "w-16",
    },
    cell: ({ row: { original: item } }) => (
      <div
        className={cn(
          // item.billAmount > 0 ? "text-green-700" : "text-red-700",
          "font-mono",
        )}
      >
        <AnimatedNumber value={item.pendingAmount} />
      </div>
    ),
  },
  {
    header: "",
    accessorKey: "action",
    meta: {
      className: "",
    },
    cell: ({ row: { original: item } }) => <div></div>,
  },
];
