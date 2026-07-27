"use client";

import {
	CustomSheet,
	CustomSheetContent,
} from "@/components/custom-sheet-content";
import { CreateStreamForm } from "@/components/finance/forms/create-stream-form";
import { TransferFundsForm } from "@/components/finance/forms/transfer-funds-form";
import { useFinanceSheetParams } from "@/hooks/use-finance-sheet-params";
import { useTRPC } from "@/trpc/client";
import { SheetHeader, SheetTitle } from "@school-clerk/ui/sheet";
import { useQuery } from "@tanstack/react-query";

export function FinanceAccountActionsSheet() {
	const {
		createFinanceAccount,
		transferFunds,
		transferFromAccountId,
		setParams,
	} = useFinanceSheetParams();
	const trpc = useTRPC();
	const isOpen = Boolean(createFinanceAccount || transferFunds);
	const { data } = useQuery(
		trpc.finance.getAccounts.queryOptions({
			period: "all",
			pageSize: 100,
			accountTypes: [],
			health: [],
		}),
	);
	const close = () =>
		setParams({
			createFinanceAccount: null,
			transferFunds: null,
			transferFromAccountId: null,
		});

	if (!isOpen) return null;

	return (
		<CustomSheet
			floating
			rounded
			size="lg"
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) close();
			}}
			sheetName="finance-account-action"
		>
			<SheetHeader>
				<SheetTitle>
					{createFinanceAccount ? "Create finance account" : "Transfer funds"}
				</SheetTitle>
			</SheetHeader>
			<CustomSheetContent>
				{createFinanceAccount ? (
					<CreateStreamForm onSuccess={close} />
				) : (
					<TransferFundsForm
						streams={(data?.data ?? []).flatMap((account) =>
							account.id && account.name
								? [{ id: account.id, name: account.name }]
								: [],
						)}
						initialFromStreamId={transferFromAccountId ?? undefined}
						onSuccess={close}
					/>
				)}
			</CustomSheetContent>
		</CustomSheet>
	);
}
