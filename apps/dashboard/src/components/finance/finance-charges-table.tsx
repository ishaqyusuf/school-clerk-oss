"use client";

import type { FinanceChargeRow } from "@/components/tables/finance-charges/columns";
import { DataTable } from "@/components/tables/finance-charges/data-table";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import { useSuspenseQuery } from "@tanstack/react-query";

type Props = {
	initialSettings?: Partial<TableSettings>;
};

export function FinanceChargesTable({ initialSettings }: Props) {
	const trpc = useTRPC();
	const { data } = useSuspenseQuery(trpc.finance.getCharges.queryOptions({}));

	return (
		<DataTable
			data={data as FinanceChargeRow[]}
			initialSettings={initialSettings}
		/>
	);
}
