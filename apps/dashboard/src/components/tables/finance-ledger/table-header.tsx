"use client";

import { Input } from "@school-clerk/ui/input";
import type { Table } from "@tanstack/react-table";
import type { FinanceLedgerRow } from "./columns";

type Props = {
	table?: Table<FinanceLedgerRow>;
};

export function DataTableHeader({ table }: Props) {
	return (
		<div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center">
			<div className="min-w-0 flex-1">
				<h2 className="font-medium text-sm">Ledger Entries</h2>
				<p className="text-muted-foreground text-xs">
					Credit, debit, transfer, payment, and charge movements across
					accounts.
				</p>
			</div>
			<Input
				className="w-full sm:max-w-[240px]"
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
