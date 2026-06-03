import { ErrorFallback } from "@/components/error-fallback";
import { RecordPaymentAction } from "@/components/finance/finance-page-actions";
import { FinancePaymentsTable } from "@/components/finance/finance-payments-table";
import { DataTableSkeleton } from "@/components/tables/finance-payments/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export async function FinancePaymentsPage() {
	const initialSettings = await getInitialTableSettings("financePayments");

	await batchPrefetch([trpc.finance.getPayments.queryOptions()]);

	return (
		<HydrateClient>
			<div className="flex flex-col gap-6 p-6">
				<PageTitle>Finance Payments</PageTitle>
				<RecordPaymentAction />
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<DataTableSkeleton />}>
						<FinancePaymentsTable initialSettings={initialSettings} />
					</Suspense>
				</ErrorBoundary>
			</div>
		</HydrateClient>
	);
}
