"use client";

import type { FinanceChargeRow } from "@/components/tables/finance-charges/columns";
import { DataTable } from "@/components/tables/finance-charges/data-table";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import { useSuspenseQuery } from "@tanstack/react-query";

type Props = {
	initialSettings?: Partial<TableSettings>;
	filter?: { payerType?: string; status?: string };
};

export function FinanceChargesTable({ initialSettings, filter = {} }: Props) {
	const trpc = useTRPC();
	const { data } = useSuspenseQuery(trpc.finance.getCharges.queryOptions(filter));

	return (
		<DataTable
			data={data as FinanceChargeRow[]}
			initialSettings={initialSettings}
		/>
	);
}
