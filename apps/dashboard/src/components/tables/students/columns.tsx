"use client";

import { StudentData } from "@/actions/get-students-list";
import { Menu } from "@/components/menu";

import { ActionCell } from "../action-cell";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { Arabic } from "@/components/arabic";
import { ColumnDef } from "@tanstack/react-table";
import { Progress } from "@/components/progress";
import { cn } from "@school-clerk/ui/cn";

export type Item = RouterOutputs["students"]["index"]["data"][number];
export const columns: ColumnDef<Item>[] = [
  {
    header: "Student",
    accessorKey: "student",
    meta: {
      className: "w-56",
    },
    cell: ({ row: { original: item } }) => (
      <div className="inline-flex gap-2 items-center">
        <Arabic className="font-bold">{item.studentName}</Arabic>
        <Progress>
          <Progress.Status color="blue" noDot>
            {item.gender}
          </Progress.Status>
        </Progress>
      </div>
    ),
  },
  {
    header: "Department",
    accessorKey: "department",
    cell: ({ row: { original: item } }) => <Arabic>{item.department}</Arabic>,
  },
  {
    header: "",
    accessorKey: "actions",
    meta: {
      className: cn("flex-1"),
    },
    cell: ({ row: { original: item } }) => {
      return <ActionCell trash itemId={item.id}></ActionCell>;
    },
  },
];
