"use client";

import type { FinancePaymentRow } from "@/components/tables/finance-payments/columns";
import { DataTable } from "@/components/tables/finance-payments/data-table";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import { useSuspenseQuery } from "@tanstack/react-query";

type Props = {
	initialSettings?: Partial<TableSettings>;
};

export function FinancePaymentsTable({ initialSettings }: Props) {
	const trpc = useTRPC();
	const { data } = useSuspenseQuery(trpc.finance.getPayments.queryOptions());

	return (
		<DataTable
			data={data as FinancePaymentRow[]}
			initialSettings={initialSettings}
		/>
	);
}
