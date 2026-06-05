"use client";

import { Button } from "@school-clerk/ui/button";
import { CreditCard, Plus } from "lucide-react";
import { useFinanceSheetParams } from "@/hooks/use-finance-sheet-params";
import { useReceivePaymentParams } from "@/hooks/use-receive-payment-params";

export function CreateChargeAction() {
	const { setParams } = useReceivePaymentParams();

	return (
		<Button
			className="w-fit gap-2"
			onClick={() => setParams({ receivePayment: true })}
		>
			<Plus className="h-4 w-4" />
			Create Charge
		</Button>
	);
}

export function RecordPaymentAction() {
	const { setParams } = useFinanceSheetParams();

	return (
		<Button
			className="w-fit gap-2"
			onClick={() => setParams({ recordFinancePayment: true })}
		>
			<CreditCard className="h-4 w-4" />
			Record Payment
		</Button>
	);
}
