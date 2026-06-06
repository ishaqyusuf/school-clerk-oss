"use client";

import { Input } from "@school-clerk/ui/input";
import type { Table } from "@tanstack/react-table";
import type { FinanceStreamRow } from "./columns";

type Props = {
	table?: Table<FinanceStreamRow>;
};

export function DataTableHeader({ table }: Props) {
	return (
		<div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center">
			<div className="min-w-0 flex-1">
				<h2 className="font-medium text-sm">Accounts</h2>
				<p className="text-muted-foreground text-xs">
					Each account has its own ledger-backed balance sheet.
				</p>
			</div>
			<Input
				className="w-full sm:max-w-[240px]"
				placeholder="Search accounts"
				value={(table?.getColumn("name")?.getFilterValue() as string) ?? ""}
				onChange={(event) =>
					table?.getColumn("name")?.setFilterValue(event.target.value)
				}
				autoComplete="off"
				autoCapitalize="none"
				autoCorrect="off"
				spellCheck="false"
			/>
		</div>
	);
}
