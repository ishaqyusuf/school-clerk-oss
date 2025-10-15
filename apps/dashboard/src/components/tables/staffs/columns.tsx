"use client";

import { ListItem } from "@/actions/get-staff-list";
import { ColumnDef } from "@tanstack/react-table";

import { ActionCell } from "../action-cell";

export type Item = ListItem;
export const columns: ColumnDef<Item>[] = [
  {
    header: "Student",
    accessorKey: "student",
    cell: ({ row: { original: item } }) => (
      <div>
        <span>{item.title}</span>
        <span>{item.name}</span>
      </div>
    ),
  },
  // {
  //   header: "Department",
  //   accessorKey: "department",
  //   cell: ({ row: { original: item } }) => <div>{item.department}</div>,
  // },
  {
    header: "",
    accessorKey: "actions",
    meta: {
      className: "flex-1",
    },
    cell: ({ row: { original: item } }) => {
      return <ActionCell trash itemId={item.id}></ActionCell>;
    },
  },
];
