"use client";

import type { FinanceChargeRow } from "@/components/tables/finance-charges/columns";
import { DataTable } from "@/components/tables/finance-charges/data-table";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import { useSuspenseQuery } from "@tanstack/react-query";

type Props = {
	initialSettings?: Partial<TableSettings>;
	filter?: {
		collectionStatus?: string;
		excludePayerType?: string;
		excludeType?: string;
		payerType?: string;
		status?: string;
		type?: string;
	};
	tableTitle?: string;
	tableDescription?: string;
	searchPlaceholder?: string;
	emptyTitle?: string;
	emptyDescription?: string;
	emptyActionHref?: string;
	emptyActionLabel?: string;
};

export function FinanceChargesTable({
	initialSettings,
	filter = {},
	tableTitle,
	tableDescription,
	searchPlaceholder,
	emptyTitle,
	emptyDescription,
	emptyActionHref,
	emptyActionLabel,
}: Props) {
	const trpc = useTRPC();
	const { data } = useSuspenseQuery(trpc.finance.getCharges.queryOptions(filter));

	return (
		<DataTable
			data={data as FinanceChargeRow[]}
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
