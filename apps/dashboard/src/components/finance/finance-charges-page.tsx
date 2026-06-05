import { ErrorFallback } from "@/components/error-fallback";
import { FinanceChargesTable } from "@/components/finance/finance-charges-table";
import { CreateChargeAction } from "@/components/finance/finance-page-actions";
import { DataTableSkeleton } from "@/components/tables/finance-charges/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

type FinanceChargesPageProps = {
	title?: string;
	filter?: { payerType?: string; status?: string };
};

export async function FinanceChargesPage({
	title = "Finance Charges",
	filter = {},
}: FinanceChargesPageProps) {
	const initialSettings = await getInitialTableSettings("financeCharges");

	await batchPrefetch([trpc.finance.getCharges.queryOptions(filter)]);

	return (
		<HydrateClient>
			<div className="flex flex-col gap-6 p-6">
				<PageTitle>{title}</PageTitle>
				<CreateChargeAction />
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<DataTableSkeleton />}>
						<FinanceChargesTable initialSettings={initialSettings} filter={filter} />
					</Suspense>
				</ErrorBoundary>
			</div>
		</HydrateClient>
	);
}
