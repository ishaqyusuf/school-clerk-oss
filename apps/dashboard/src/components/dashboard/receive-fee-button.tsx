"use client";

import { useReceivePaymentParams } from "@/hooks/use-receive-payment-params";
import { useStudentRegistrationPolicy } from "@/hooks/use-student-registration-policy";
import { Button } from "@school-clerk/ui/button";
import { CreditCard } from "lucide-react";

export function ReceiveFeeButton({
	layout = "tile",
}: {
	/** "tile" for the quick-links grid; "toolbar" for a page header action. */
	layout?: "tile" | "toolbar";
}) {
	const { setParams } = useReceivePaymentParams();
	// Hidden unless Billing & finance is on; the sheet's API calls would fail otherwise.
	const { billingEnabled } = useStudentRegistrationPolicy();
	if (!billingEnabled) return null;
	return (
		<Button
			variant={layout === "toolbar" ? "default" : "outline"}
			className={layout === "toolbar" ? "gap-2" : "h-auto flex-col gap-2 py-5"}
			onClick={() => setParams({ receivePayment: true })}
		>
			<CreditCard className={layout === "toolbar" ? "h-4 w-4" : "h-5 w-5"} />
			<span className="text-sm font-medium">Receive Fee</span>
		</Button>
	);
}
