"use client";

import { Button } from "@school-clerk/ui/button";
import { CreditCard, School } from "lucide-react";
import Link from "next/link";
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

export function CollectByClassAction() {
	return (
		<Button asChild variant="outline" className="w-fit gap-2">
			<Link href="/finance/receive/class">
				<School className="h-4 w-4" />
				Collect by class
			</Link>
		</Button>
	);
}
