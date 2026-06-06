"use client";

import type { FinancePaymentRow } from "@/components/tables/finance-payments/columns";
import { DataTable } from "@/components/tables/finance-payments/data-table";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import { useSuspenseQuery } from "@tanstack/react-query";

type Props = {
	initialSettings?: Partial<TableSettings>;
	filter?: { payerType?: string };
	tableTitle?: string;
	tableDescription?: string;
	searchPlaceholder?: string;
	emptyTitle?: string;
	emptyDescription?: string;
	emptyActionHref?: string;
	emptyActionLabel?: string;
};

export function FinancePaymentsTable({
	initialSettings,
	filter,
	tableTitle,
	tableDescription,
	searchPlaceholder,
	emptyTitle,
	emptyDescription,
	emptyActionHref,
	emptyActionLabel,
}: Props) {
	const trpc = useTRPC();
	const { data } = useSuspenseQuery(trpc.finance.getPayments.queryOptions(filter));

	return (
		<DataTable
			data={data as FinancePaymentRow[]}
			initialSettings={initialSettings}
			tableTitle={tableTitle}
			tableDescription={tableDescription}
			searchPlaceholder={searchPlaceholder}
			emptyTitle={emptyTitle}
			emptyDescription={emptyDescription}
			emptyActionHref={emptyActionHref}
			emptyActionLabel={emptyActionLabel}
		/>
	);
}
