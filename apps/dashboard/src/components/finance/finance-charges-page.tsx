import { ErrorFallback } from "@/components/error-fallback";
import { FinanceChargesTable } from "@/components/finance/finance-charges-table";
import { DataTableSkeleton } from "@/components/tables/finance-charges/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense, type ReactNode } from "react";

type FinanceChargesPageProps = {
	title?: string;
	subtitle?: string;
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

export async function FinanceChargesPage({
	title = "Finance Charges",
	subtitle,
	filter = {},
	tableTitle,
	tableDescription,
	searchPlaceholder,
	emptyTitle,
	emptyDescription,
	emptyActionHref,
	emptyActionLabel,
	headerAction,
	children,
}: FinanceChargesPageProps & { children?: ReactNode; headerAction?: ReactNode }) {
	const initialSettings = await getInitialTableSettings("financeCharges");

	await batchPrefetch([trpc.finance.getCharges.queryOptions(filter)]);

	return (
		<HydrateClient>
			<div className="flex flex-col gap-6 p-6">
				<PageTitle>{title}</PageTitle>
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
						{subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
					</div>
					{headerAction}
				</div>
				{children}
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<DataTableSkeleton />}>
						<FinanceChargesTable
							initialSettings={initialSettings}
							filter={filter}
							tableTitle={tableTitle}
							tableDescription={tableDescription}
							searchPlaceholder={searchPlaceholder}
							emptyTitle={emptyTitle}
							emptyDescription={emptyDescription}
							emptyActionHref={emptyActionHref}
							emptyActionLabel={emptyActionLabel}
						/>
					</Suspense>
				</ErrorBoundary>
			</div>
		</HydrateClient>
	);
}
