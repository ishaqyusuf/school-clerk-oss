"use client";

import { Input } from "@school-clerk/ui/input";
import type { Table } from "@tanstack/react-table";
import type { FinanceLedgerRow } from "./columns";

type Props = {
	table?: Table<FinanceLedgerRow>;
};

export function DataTableHeader({ table }: Props) {
	return (
		<div className="flex items-center gap-3 border-b px-4 py-3">
			<div className="min-w-0 flex-1">
				<h2 className="font-medium text-sm">Ledger Entries</h2>
				<p className="text-muted-foreground text-xs">
					Credit, debit, transfer, payment, and charge movements for this
					stream.
				</p>
			</div>
			<Input
				className="w-full max-w-[240px]"
				placeholder="Search ledger"
				value={(table?.getColumn("source")?.getFilterValue() as string) ?? ""}
				onChange={(event) =>
					table?.getColumn("source")?.setFilterValue(event.target.value)
				}
				autoComplete="off"
				autoCapitalize="none"
				autoCorrect="off"
				spellCheck="false"
			/>
		</div>
	);
}
