import { ErrorFallback } from "@/components/error-fallback";
import { FinanceItemsTable } from "@/components/finance/finance-items-table";
import { DataTableSkeleton } from "@/components/tables/finance-items/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense, type ReactNode } from "react";

type FinanceItemsPageProps = {
	title?: string;
	subtitle?: string;
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
	children?: ReactNode;
};

export async function FinanceItemsPage({
	title = "Finance Items",
	subtitle,
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
	children,
}: FinanceItemsPageProps = {}) {
	const initialSettings = await getInitialTableSettings("financeItems");
	const isServiceBillables = filter.type === "SERVICE";
	const isFeeStructures = filter.excludeType === "SERVICE";
	const resolvedTableTitle =
		tableTitle ??
		(isServiceBillables
			? "Service Billables"
			: isFeeStructures
				? "Fee Structures"
				: "Finance Items");
	const resolvedTableDescription =
		tableDescription ??
		(isServiceBillables
			? "Reusable school-side service and expense items used when creating payables."
			: isFeeStructures
				? "Reusable student fee definitions used when assigning charges."
				: "Reusable billable definitions used by finance workflows.");
	const resolvedSearchPlaceholder =
		searchPlaceholder ??
		(isServiceBillables
			? "Search service billables"
			: isFeeStructures
				? "Search fee structures"
				: "Search finance items");
	const resolvedEmptyTitle =
		emptyTitle ??
		(isServiceBillables
			? "No service billables"
			: isFeeStructures
				? "No fee structures"
				: "No finance items");
	const resolvedEmptyDescription =
		emptyDescription ??
		(isServiceBillables
			? "Create reusable school-side service and expense items before recording payable bills."
			: isFeeStructures
				? "Create fee structures before assigning student charges."
				: "Create reusable finance items before assigning charges or bills.");
	const resolvedShowAddFeeAction =
		showAddFeeAction ?? !isServiceBillables;
	const resolvedEmptyActionLabel =
		emptyActionLabel ??
		(isServiceBillables
			? "Review payables"
			: isFeeStructures
				? "Receive student payment"
				: "Open finance");
	const resolvedEmptyActionHref =
		emptyActionHref ??
		(isServiceBillables
			? "/finance/payables"
			: isFeeStructures
				? "/finance/receive"
				: "/finance");

	await batchPrefetch([trpc.finance.getItems.queryOptions(filter)]);

	return (
		<HydrateClient>
			<div className="flex flex-col gap-6 p-6">
				<PageTitle>{title}</PageTitle>
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
						{subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
					</div>
				</div>
				{children}
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<DataTableSkeleton />}>
						<FinanceItemsTable
							initialSettings={initialSettings}
							filter={filter}
							tableTitle={resolvedTableTitle}
							tableDescription={resolvedTableDescription}
							searchPlaceholder={resolvedSearchPlaceholder}
							emptyTitle={resolvedEmptyTitle}
							emptyDescription={resolvedEmptyDescription}
							emptyActionHref={resolvedEmptyActionHref}
							emptyActionLabel={resolvedEmptyActionLabel}
							actionLabel={actionLabel}
							showAddFeeAction={resolvedShowAddFeeAction}
						/>
					</Suspense>
				</ErrorBoundary>
			</div>
		</HydrateClient>
	);
}
