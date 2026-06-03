"use client";

import { EmptyState, NoResults } from "@/components/tables/core";

export function EmptyLedger() {
	return (
		<EmptyState
			title="No ledger entries"
			description="Charges, payments, transfers, and adjustments will appear here."
			actionLabel="Back to streams"
			onAction={() => {
				window.location.href = "/finance/streams";
			}}
		/>
	);
}

export { NoResults };
