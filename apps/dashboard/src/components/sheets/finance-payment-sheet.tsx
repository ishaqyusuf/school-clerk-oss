"use client";

import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@school-clerk/ui/select";
import { SheetHeader, SheetTitle } from "@school-clerk/ui/sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CustomSheet, CustomSheetContent } from "@/components/custom-sheet-content";
import { useFinanceSheetParams } from "@/hooks/use-finance-sheet-params";
import { useTRPC } from "@/trpc/client";

export function FinancePaymentSheet() {
	const {
		recordFinancePayment,
		financeChargeId,
		financePaymentPayerType,
		setParams,
	} = useFinanceSheetParams();
	const isOpen = Boolean(recordFinancePayment);

	if (!isOpen) return null;

	return (
		<CustomSheet
			floating
			rounded
			size="lg"
			open={isOpen}
			onOpenChange={() => setParams(null)}
			sheetName="finance-payment"
		>
			<SheetHeader>
				<SheetTitle>Record Finance Payment</SheetTitle>
			</SheetHeader>
			<CustomSheetContent className="flex flex-col gap-2">
				<FinancePaymentForm
					initialChargeId={financeChargeId ?? ""}
					initialPayerType={financePaymentPayerType ?? null}
					onSuccess={() => setParams(null)}
				/>
			</CustomSheetContent>
		</CustomSheet>
	);
}

function FinancePaymentForm({
	initialChargeId,
	initialPayerType,
	onSuccess,
}: {
	initialChargeId: string;
	initialPayerType: string | null;
	onSuccess: () => void;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [chargeId, setChargeId] = useState(initialChargeId);
	const [amount, setAmount] = useState("");
	const [method, setMethod] = useState("");
	const [reference, setReference] = useState("");
	const [note, setNote] = useState("");
	const initialChargeFilter = useMemo(
		() =>
			initialPayerType === "SCHOOL" || initialPayerType === "STAFF"
				? { payerType: initialPayerType }
				: {},
		[initialPayerType],
	);
	const { data: charges = [] } = useQuery(
		trpc.finance.getCharges.queryOptions(initialChargeFilter),
	);
	const selectedCharge = useMemo(
		() => charges.find((charge) => charge.id === chargeId),
		[charges, chargeId],
	);
	const isLoadingPreselectedCharge = Boolean(chargeId) && !selectedCharge;
	const payerContext = selectedCharge?.payerType ?? initialPayerType;
	const showStudentFilter =
		!isLoadingPreselectedCharge &&
		(!payerContext || payerContext === "STUDENT");
	const isPayableContext =
		isLoadingPreselectedCharge ||
		payerContext === "SCHOOL" ||
		payerContext === "STAFF";
	const chargeLabel = isPayableContext ? "Payable" : "Charge";
	const submitLabel = isPayableContext
		? "Record Payable Payment"
		: "Record Payment";

	useEffect(() => {
		if (!selectedCharge) return;
		setAmount(String(selectedCharge.outstanding || selectedCharge.amount));
	}, [selectedCharge]);

	const recordPayment = useMutation(
		trpc.finance.recordPayment.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.finance.getPayments.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.finance.getCharges.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.finance.overview.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.finance.getLedgerEntries.queryKey(),
					}),
				]);
				onSuccess();
			},
		}),
	);

	const onSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!chargeId || !amount) return;

		recordPayment.mutate({
			chargeId,
			amount: Number(amount),
			method: method.trim() || null,
			reference: reference.trim() || null,
			note: note.trim() || null,
			paymentDate: null,
			receivedById: null,
		});
	};

	const [studentQuery, setStudentQuery] = useState("");
	const { data: students = [] } = useQuery(
		trpc.finance.searchFinanceStudents.queryOptions(
			{ q: studentQuery },
			{ enabled: showStudentFilter },
		),
	);
	const [studentId, setStudentId] = useState<string>("");

	const filteredCharges = useMemo(() => {
		const payableType = isPayableContext ? payerContext : null;
		if (payableType) {
			return charges.filter(
				(charge) =>
					charge.payerType === payableType && charge.outstanding > 0,
			);
		}

		if (studentId && studentId !== "none") {
			return charges.filter(
				(c) => c.studentId === studentId && c.outstanding > 0,
			);
		}
		return charges.filter((c) => c.outstanding > 0);
	}, [charges, isPayableContext, payerContext, studentId]);

	return (
		<form className="space-y-4" onSubmit={onSubmit}>
			{showStudentFilter && (
				<div className="space-y-2">
					<Label>Student filter</Label>
					<Select value={studentId} onValueChange={setStudentId}>
						<SelectTrigger>
							<SelectValue placeholder="Select student to filter charges" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="none">All Students</SelectItem>
							{students.map((student) => (
								<SelectItem key={student.id} value={student.id}>
									{student.name} {student.surname}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)}
			<div className="space-y-2">
				<Label>{chargeLabel}</Label>
				<Select value={chargeId || undefined} onValueChange={setChargeId}>
					<SelectTrigger>
						<SelectValue placeholder={`Select ${chargeLabel.toLowerCase()}`} />
					</SelectTrigger>
					<SelectContent>
						{filteredCharges.map((charge) => (
							<SelectItem key={charge.id} value={charge.id}>
								{charge.title} - NGN {charge.outstanding}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="grid gap-3 md:grid-cols-2">
				<div className="space-y-2">
					<Label>Amount</Label>
					<Input
						inputMode="decimal"
						placeholder="0"
						value={amount}
						onChange={(event) => setAmount(event.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label>Method</Label>
					<Input
						placeholder="Cash, transfer, POS"
						value={method}
						onChange={(event) => setMethod(event.target.value)}
					/>
				</div>
			</div>
			<div className="space-y-2">
				<Label>Reference</Label>
				<Input
					placeholder="Optional receipt/reference"
					value={reference}
					onChange={(event) => setReference(event.target.value)}
				/>
			</div>
			<div className="space-y-2">
				<Label>Note</Label>
				<Input
					placeholder="Optional note"
					value={note}
					onChange={(event) => setNote(event.target.value)}
				/>
			</div>
			<Button disabled={recordPayment.isPending} type="submit">
				{submitLabel}
			</Button>
		</form>
	);
}
