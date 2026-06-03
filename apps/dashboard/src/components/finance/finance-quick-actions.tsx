import type { FinanceStreamRow } from "@/components/tables/finance-streams/columns";
import { CreateItemForm } from "./forms/create-item-form";
import { CreateStreamForm } from "./forms/create-stream-form";
import { TransferFundsForm } from "./forms/transfer-funds-form";

type FinanceQuickActionsProps = {
	streams: FinanceStreamRow[];
};

export function FinanceQuickActions({ streams }: FinanceQuickActionsProps) {
	return (
		<div className="grid gap-3 lg:grid-cols-3">
			<CreateStreamForm />
			<CreateItemForm />
			<TransferFundsForm streams={streams} />
		</div>
	);
}
