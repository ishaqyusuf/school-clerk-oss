"use client";

import { flexRender, type Row } from "@tanstack/react-table";

import { cn } from "@school-clerk/ui/cn";
import { TableRow as BaseTableRow, TableCell } from "@school-clerk/ui/table";

import { useTable } from ".";

type Props = {
  // row: Row<any>;
};

export function TableRow({}: Props) {
  const { table, tableMeta } = useTable();

  return (
    <>
      {table.getRowModel().rows.map((row) => (
        <BaseTableRow className={cn()} key={row.id}>
          {row.getVisibleCells().map((cell, index) => (
            <TableCell
              key={cell.id}
              onClick={(e) => {
                if (cell.column.id == "actions") return;
                tableMeta?.rowClick?.(row.original?.id, row.original);
                const meta = cell.column.columnDef?.meta as any;
                meta?.onClick?.(row?.original);
              }}
              className={cn(
                (cell.column.columnDef.meta as any)?.className,
                tableMeta?.rowClick ||
                  ((cell?.column?.columnDef?.meta as any)?.onClick &&
                    "cursor-pointer hover:bg-transparent"),
              )}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          ))}
        </BaseTableRow>
      ))}
    </>
  );
}
