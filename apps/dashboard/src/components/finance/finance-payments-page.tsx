import { ErrorFallback } from "@/components/error-fallback";
import { FinancePaymentsTable } from "@/components/finance/finance-payments-table";
import { DataTableSkeleton } from "@/components/tables/finance-payments/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense, type ReactNode } from "react";

export async function FinancePaymentsPage({
	title = "Finance Payments",
	subtitle,
	filter,
	headerAction,
	children,
	tableTitle,
	tableDescription,
	searchPlaceholder,
	emptyTitle,
	emptyDescription,
	emptyActionHref,
	emptyActionLabel,
}: {
	title?: string;
	subtitle?: string;
	filter?: { payerType?: string };
	headerAction?: ReactNode;
	children?: ReactNode;
	tableTitle?: string;
	tableDescription?: string;
	searchPlaceholder?: string;
	emptyTitle?: string;
	emptyDescription?: string;
	emptyActionHref?: string;
	emptyActionLabel?: string;
} = {}) {
	const initialSettings = await getInitialTableSettings("financePayments");

	await batchPrefetch([trpc.finance.getPayments.queryOptions(filter)]);

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
						<FinancePaymentsTable
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
