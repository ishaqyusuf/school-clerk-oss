"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/tables/finance-ledger/data-table";
import type { FinanceLedgerRow } from "@/components/tables/finance-ledger/columns";
import { useTRPC } from "@/trpc/client";

export function FinanceTransactionsTable() {
	const trpc = useTRPC();
	const { data } = useSuspenseQuery(trpc.finance.getLedgerEntries.queryOptions());

	return <DataTable data={data as FinanceLedgerRow[]} />;
}
