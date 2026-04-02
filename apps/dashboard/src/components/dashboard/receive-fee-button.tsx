"use client";

import { useReceivePaymentParams } from "@/hooks/use-receive-payment-params";
import { Button } from "@school-clerk/ui/button";
import { CreditCard } from "lucide-react";

export function ReceiveFeeButton() {
	const { setParams } = useReceivePaymentParams();
	return (
		<Button
			variant="outline"
			className="h-auto flex-col gap-2 py-5"
			onClick={() => setParams({ receivePayment: true })}
		>
			<CreditCard className="h-5 w-5" />
			<span className="text-sm font-medium">Receive Fee</span>
		</Button>
	);
}
