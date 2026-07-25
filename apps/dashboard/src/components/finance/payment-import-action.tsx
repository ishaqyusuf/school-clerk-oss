"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@school-clerk/ui/button";
import { Upload } from "lucide-react";
import { parseAsString, useQueryStates } from "nuqs";

export function PaymentImportAction({
	mode = "STUDENT",
}: {
	mode?: "STUDENT" | "STAFF";
}) {
	const auth = useAuth();
	const [, setParams] = useQueryStates({
		action: parseAsString,
		paymentImportMode: parseAsString,
	});
	if (
		auth.role !== "ADMIN" &&
		auth.role !== "Admin" &&
		auth.role !== "Accountant"
	) {
		return null;
	}

	return (
		<Button
			variant="outline"
			className="w-fit gap-2"
			onClick={() =>
				setParams({
					action: "payment-import",
					paymentImportMode: mode,
				})
			}
		>
			<Upload className="h-4 w-4" />
			Import payments
		</Button>
	);
}
