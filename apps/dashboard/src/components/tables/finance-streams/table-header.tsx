"use client";

import { Input } from "@school-clerk/ui/input";
import type { Table } from "@tanstack/react-table";
import type { FinanceStreamRow } from "./columns";

type Props = {
	table?: Table<FinanceStreamRow>;
};

export function DataTableHeader({ table }: Props) {
	return (
		<div className="flex items-center gap-3 border-b px-4 py-3">
			<div className="min-w-0 flex-1">
				<h2 className="font-medium text-sm">Account Streams</h2>
				<p className="text-muted-foreground text-xs">
					Each stream has its own ledger-backed balance sheet.
				</p>
			</div>
			<Input
				className="w-full max-w-[240px]"
				placeholder="Search streams"
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
