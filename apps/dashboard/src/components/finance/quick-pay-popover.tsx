"use client";

import {
	PAYMENT_METHODS,
	formatNaira,
	invalidateStudentPaymentQueries,
	parseAmount,
} from "@/components/finance/student-payment-allocation";
import { useReceivePaymentParams } from "@/hooks/use-receive-payment-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import { Input } from "@school-clerk/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@school-clerk/ui/popover";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Banknote } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// The cashier's last method carries over to the next quick payment.
let lastMethod: string = "Cash";

/**
 * Pay from the row (finance/quick-payment-receive, direction 01): a small
 * popover with the fee's balance prefilled — click Pay, Enter, done. Anything
 * unusual goes to the full receive sheet with this fee already ticked.
 */
export function QuickPayPopover({
	chargeId,
	chargeTitle,
	outstanding,
	studentId,
	studentName,
}: {
	chargeId: string;
	chargeTitle: string;
	outstanding: number;
	studentId: string;
	studentName?: string | null;
}) {
	const trpc = useTRPC();
	const qc = useQueryClient();
	const receivePaymentParams = useReceivePaymentParams();
	const [open, setOpen] = useState(false);
	const [amount, setAmount] = useState(String(outstanding));
	const [method, setMethod] = useState(lastMethod);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (open) {
			setAmount(String(outstanding));
			setMethod(lastMethod);
			setTimeout(() => inputRef.current?.select(), 0);
		}
	}, [open, outstanding]);

	const mutation = useMutation(
		trpc.finance.receiveStudentPaymentLines.mutationOptions({
			meta: {
				toastTitle: {
					loading: "Recording payment...",
					success: `Payment recorded${studentName ? ` for ${studentName}` : ""}`,
					error: "Could not record payment",
				},
			},
			onSuccess() {
				void invalidateStudentPaymentQueries(qc, trpc);
				setOpen(false);
			},
		}),
	);

	const value = parseAmount(amount);
	const tooMuch = value > outstanding + 0.009;
	const canSubmit = value > 0 && !tooMuch && !mutation.isPending;

	const submit = () => {
		if (!canSubmit) return;
		lastMethod = method;
		mutation.mutate({
			studentId,
			lines: [{ chargeId, amount: value }],
			otherLines: [],
			method,
			paymentDate: new Date(),
		});
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-7 gap-1.5 px-2.5"
					onClick={(event) => event.stopPropagation()}
				>
					<Banknote className="h-3.5 w-3.5" />
					Pay
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="w-80 p-0"
				onClick={(event) => event.stopPropagation()}
			>
				<form
					className="space-y-3 p-4"
					onSubmit={(event) => {
						event.preventDefault();
						submit();
					}}
				>
					<div>
						<p className="truncate font-semibold text-sm">
							{studentName || "Student"}
						</p>
						<p className="truncate text-muted-foreground text-xs">
							{chargeTitle} · {formatNaira(outstanding)} due
						</p>
					</div>
					<label className="flex h-11 items-center rounded-md border border-input bg-background px-3 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20">
						<span className="mr-2 font-mono text-muted-foreground text-sm">NGN</span>
						<input
							ref={inputRef}
							inputMode="decimal"
							aria-label="Amount received"
							className="w-full bg-transparent font-mono font-semibold text-lg tabular-nums outline-none"
							value={amount}
							onChange={(event) => setAmount(event.target.value)}
						/>
					</label>
					{tooMuch ? (
						<p className="text-destructive text-xs">
							Only {formatNaira(outstanding)} is owed on this fee.
						</p>
					) : null}
					<div className="flex flex-wrap gap-1.5" role="group" aria-label="Payment method">
						{PAYMENT_METHODS.map((option) => (
							<Button
								key={option}
								type="button"
								size="sm"
								variant={method === option ? "secondary" : "outline"}
								aria-pressed={method === option}
								className={cn("h-7 px-2 text-xs", method === option && "ring-1 ring-primary")}
								onClick={() => setMethod(option)}
							>
								{option}
							</Button>
						))}
					</div>
					<div className="flex items-center gap-2 pt-1">
						<Button
							type="button"
							variant="link"
							className="h-auto px-0 text-xs"
							onClick={() => {
								setOpen(false);
								receivePaymentParams.setParams({
									receivePayment: true,
									receivePaymentStudentId: studentId,
									receivePaymentStudentName: studentName ?? null,
									receivePaymentChargeId: chargeId,
								});
							}}
						>
							More options…
						</Button>
						<Button type="submit" size="sm" className="ml-auto" disabled={!canSubmit}>
							Record {value ? formatNaira(value) : ""}
						</Button>
					</div>
				</form>
			</PopoverContent>
		</Popover>
	);
}
