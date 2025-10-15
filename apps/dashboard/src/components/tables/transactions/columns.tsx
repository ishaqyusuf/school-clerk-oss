"use client";

import { PageItem } from "@/actions/get-transactions";
import { AnimatedNumber } from "@/components/animated-number";
import { NumberInput } from "@/components/currency-input";
import { ColumnDef } from "@tanstack/react-table";

import { cn } from "@school-clerk/ui/cn";
import { studentDisplayName } from "@/utils/utils";

export type Item = PageItem;
export const columns: ColumnDef<Item>[] = [
  // {
  //   header: "Transaction",
  //   accessorKey: "billable",
  //   cell: ({ row: { original: item } }) => (
  //     <div>
  //       <div className="font-bold">{studentDisplayName(item.student)}</div>
  //     </div>
  //   ),
  // },
  {
    header: "Transaction",
    accessorKey: "billable",
    cell: ({ row: { original: item } }) => (
      <div>
        <div className="flex gap-2">
          <span className="font-bold">{studentDisplayName(item.student)}</span>
        </div>

        <div className="inline-flex gap-1">
          <span>
            {[item.billTerm?.title, item.billTerm?.session?.title]?.join(" ")}
          </span>
          <span>{"-"}</span>
          <div className="">{item.type}</div>
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
    header: "",
    accessorKey: "action",
    meta: {
      className: "",
    },
    cell: ({ row: { original: item } }) => <div></div>,
  },
];
