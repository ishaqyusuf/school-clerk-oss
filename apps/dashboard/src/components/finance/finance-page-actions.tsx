"use client";

import { Button } from "@school-clerk/ui/button";
import { CreditCard } from "lucide-react";
import { useReceivePaymentParams } from "@/hooks/use-receive-payment-params";

export function ReceivePaymentAction() {
	const { setParams } = useReceivePaymentParams();

	return (
		<Button
			className="w-fit gap-2"
			onClick={() => setParams({ receivePayment: true })}
		>
			<CreditCard className="h-4 w-4" />
			Receive Payment
		</Button>
	);
}
