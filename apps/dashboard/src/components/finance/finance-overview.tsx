"use client";

import { FinanceOverviewStats } from "@/components/finance/finance-overview-stats";
import { FinanceQuickActions } from "@/components/finance/finance-quick-actions";
import { DataTable as FinanceStreamsTable } from "@/components/tables/finance-streams/data-table";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import { useSuspenseQuery } from "@tanstack/react-query";

type FinanceOverviewProps = {
	title?: string;
	initialStreamSettings?: Partial<TableSettings>;
};

export function FinanceOverview({
	title = "Finance",
	initialStreamSettings,
}: FinanceOverviewProps) {
	const trpc = useTRPC();
	const { data } = useSuspenseQuery(trpc.finance.overview.queryOptions());
	const streams = data.streams;

	return (
		<div className="space-y-6 p-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Streams, charges, payments, transfers, and ledger balances.
				</p>
			</div>

			<FinanceOverviewStats summary={data.summary} />
			<FinanceQuickActions streams={streams} />

			<FinanceStreamsTable
				data={streams}
				initialSettings={initialStreamSettings}
				onCreateStream={() => {
					document.getElementById("finance-stream-name")?.focus();
				}}
			/>
		</div>
	);
}
