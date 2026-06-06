"use client";

import { FinanceTable } from "@/components/tables/finance-table";
import type { TableSettings } from "@/utils/table-settings";
import { useAddFeeParams } from "@/hooks/use-add-fee-params";
import { AddFeeSheet } from "@/components/finance/forms/add-fee-sheet";
import { Button } from "@school-clerk/ui/button";
import { Plus } from "lucide-react";
import { type FinanceItemRow, columns } from "./columns";

export function DataTable({
	data,
	initialSettings,
	tableTitle = "Finance Items",
	tableDescription = "Reusable tuition, book, service, salary, and other billable definitions.",
	searchPlaceholder = "Search items",
	emptyTitle = "No finance items",
	emptyDescription = "Create tuition fees, books, services, or salary items from the finance quick actions.",
	emptyActionHref,
	emptyActionLabel,
	actionLabel = "Add Fee",
	showAddFeeAction = true,
}: {
	data: FinanceItemRow[];
	initialSettings?: Partial<TableSettings>;
	tableTitle?: string;
	tableDescription?: string;
	searchPlaceholder?: string;
	emptyTitle?: string;
	emptyDescription?: string;
	emptyActionHref?: string;
	emptyActionLabel?: string;
	actionLabel?: string;
	showAddFeeAction?: boolean;
}) {
	const { setParams } = useAddFeeParams();

	return (
		<>
			<FinanceTable
				data={data}
				columns={columns}
				tableId="financeItems"
				initialSettings={initialSettings}
				title={tableTitle}
				description={tableDescription}
				searchColumnId="name"
				searchPlaceholder={searchPlaceholder}
				emptyTitle={emptyTitle}
				emptyDescription={emptyDescription}
				emptyActionHref={emptyActionHref}
				emptyActionLabel={emptyActionLabel}
				action={showAddFeeAction ? (
					<Button
						variant="outline"
						size="sm"
						className="ml-auto flex items-center gap-2"
						onClick={() => setParams({ addFee: true })}
					>
						<Plus className="h-4 w-4" />
						{actionLabel}
					</Button>
				) : undefined}
			/>
			{showAddFeeAction && <AddFeeSheet />}
		</>
	);
}
