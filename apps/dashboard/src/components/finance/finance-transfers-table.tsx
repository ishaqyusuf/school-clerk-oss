"use client";

import { DataTable } from "@/components/tables/finance-transfers/data-table";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import { useSuspenseQuery } from "@tanstack/react-query";

type Props = {
	initialSettings?: Partial<TableSettings>;
};

export function FinanceTransfersTable({ initialSettings }: Props) {
	const trpc = useTRPC();
	const { data } = useSuspenseQuery(
		trpc.finance.getInternalTransfers.queryOptions({}),
	);

	return <DataTable data={data} initialSettings={initialSettings} />;
}
