"use client";

import { FinanceTable } from "@/components/tables/finance-table";
import { DataTable as Ledger } from "@/components/tables/finance-ledger/data-table";
import { DataTable as Streams } from "@/components/tables/finance-streams/data-table";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { Table as LegacyTable } from "@school-clerk/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";

const rows = Array.from({ length: 40 }, (_, i) => ({ id: `sample-${i}`, name: `Sample account ${i + 1}` }));
const columns: ColumnDef<(typeof rows)[number]>[] = [
  { id: "select", size: 50, header: ({ table }) => <Checkbox aria-label="Select all samples" checked={table.getIsAllRowsSelected()} onCheckedChange={v => table.toggleAllRowsSelected(v === true)} />, cell: ({ row }) => <Checkbox aria-label="Select sample" checked={row.getIsSelected()} onCheckedChange={v => row.toggleSelected(v === true)} /> },
  { accessorKey: "name", header: "Account" },
];

export default function TableLayoutQA() {
  return <div className="space-y-6">
    <h1>Temporary table layout QA — synthetic records</h1>
    <FinanceTable data={rows} columns={columns} tableId="financeItems" title="Finance layout" description="Synthetic layout data" searchColumnId="name" searchPlaceholder="Search sample accounts" emptyTitle="Empty" emptyDescription="Empty" />
    <div className="overflow-x-auto"><LegacyTable.Provider args={[{ data: rows.slice(0, 4), columns: columns as never, checkbox: true }]}><LegacyTable><LegacyTable.Header /><LegacyTable.Body><LegacyTable.Row /></LegacyTable.Body></LegacyTable></LegacyTable.Provider></div>
    <Streams data={rows.map(row => ({ ...row, accountType: "CREDIT", credit: 100, debit: 20, balance: 80 }))} />
    <Ledger data={rows.map(row => ({ id: row.id, note: row.name, amount: 100, direction: "CREDIT", occurredAt: "2026-10-06" }))} />
  </div>;
}
