"use client";

import { BillablePageItem } from "@/actions/get-billables";
import { ClassRoomPageItem } from "@/actions/get-class-rooms";
import { NumberInput } from "@/components/currency-input";
import { ColumnDef } from "@tanstack/react-table";

export type Item = BillablePageItem;
export const columns: ColumnDef<Item>[] = [
  {
    header: "Billable",
    accessorKey: "billable",
    cell: ({ row: { original: item } }) => (
      <div>
        <div className="font-bold">{item.title}</div>
        <div className="">{item.description}</div>
      </div>
    ),
  },
  {
    header: "Department",
    accessorKey: "department",
    meta: {
      className: "w-16",
    },
    cell: ({ row: { original: item } }) => (
      <div>
        <NumberInput prefix="NGN " value={item.amount} readOnly />
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
