"use client";

import { DataTable } from "@/components/tables/finance-items/data-table";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import { useSuspenseQuery } from "@tanstack/react-query";

type Props = {
	initialSettings?: Partial<TableSettings>;
	filter?: { type?: string; excludeType?: string };
	tableTitle?: string;
	tableDescription?: string;
	searchPlaceholder?: string;
	emptyTitle?: string;
	emptyDescription?: string;
	emptyActionHref?: string;
	emptyActionLabel?: string;
	actionLabel?: string;
	showAddFeeAction?: boolean;
};

export function FinanceItemsTable({
	initialSettings,
	filter = {},
	tableTitle,
	tableDescription,
	searchPlaceholder,
	emptyTitle,
	emptyDescription,
	emptyActionHref,
	emptyActionLabel,
	actionLabel,
	showAddFeeAction,
}: Props) {
	const trpc = useTRPC();
	const { data } = useSuspenseQuery(trpc.finance.getItems.queryOptions(filter));

	return (
		<DataTable
			data={data}
			initialSettings={initialSettings}
			tableTitle={tableTitle}
			tableDescription={tableDescription}
			searchPlaceholder={searchPlaceholder}
			emptyTitle={emptyTitle}
			emptyDescription={emptyDescription}
			emptyActionHref={emptyActionHref}
			emptyActionLabel={emptyActionLabel}
			actionLabel={actionLabel}
			showAddFeeAction={showAddFeeAction}
		/>
	);
}
