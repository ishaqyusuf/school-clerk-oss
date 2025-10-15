"use client";

import { SchoolFeePageItem } from "@/actions/get-school-fees";
import { ColumnDef } from "@tanstack/react-table";

export type Item = SchoolFeePageItem;
export const columns: ColumnDef<Item>[] = [
  {
    header: "Classroom",
    accessorKey: "class_room",
    cell: ({ row: { original: item } }) => (
      <div>
        <div className="font-semibold">{item.title}</div>
        <div>{item.description}</div>
        {/* {item.classRoom?.name === item.departmentName
          ? ""
          : item.classRoom.name} */}
      </div>
    ),
  },
  {
    header: "Amount",
    accessorKey: "department",
    cell: ({ row: { original: item } }) => <div>{item.amount}</div>,
  },
];
