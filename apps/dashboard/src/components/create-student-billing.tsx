"use client";

import { useTRPC } from "@/trpc/client";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

type Props = {
	studentId: string;
	termId: string;
	studentTermId?: string | null;
};

export function CreateStudentBilling({
	studentId,
	termId,
	studentTermId,
}: Props) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [title, setTitle] = useState("Tuition Fee");
	const [amount, setAmount] = useState("");
	const [type, setType] = useState<"TUITION_FEE" | "BOOK" | "OTHER">(
		"TUITION_FEE",
	);
	const [description, setDescription] = useState("");

	const createCharge = useMutation(
		trpc.finance.createCharge.mutationOptions({
			onSuccess: async () => {
				setAmount("");
				setDescription("");
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.finance.getReceivePaymentData.queryKey({
							studentId,
						}),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.finance.getStudentPayments.queryKey({
							studentId,
							termId,
						}),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.finance.overview.queryKey(),
					}),
				]);
			},
		}),
	);

	const onSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!amount || !title.trim()) return;

		createCharge.mutate({
			payerType: "STUDENT",
			studentId,
			studentTermFormId: studentTermId,
			termId,
			type,
			title: title.trim(),
			description: description.trim() || null,
			amount: Number(amount),
			collectionStatus: type === "BOOK" ? "NOT_COLLECTED" : "NOT_REQUIRED",
		});
	};

	return (
		<form className="space-y-4" onSubmit={onSubmit}>
			<div className="grid gap-3 md:grid-cols-2">
				<div className="space-y-2">
					<Label>Type</Label>
					<Select value={type} onValueChange={(value) => setType(value as typeof type)}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="TUITION_FEE">Tuition fee</SelectItem>
							<SelectItem value="BOOK">Book</SelectItem>
							<SelectItem value="OTHER">Other</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-2">
					<Label>Amount</Label>
					<Input
						inputMode="decimal"
						placeholder="0"
						value={amount}
						onChange={(event) => setAmount(event.target.value)}
					/>
				</div>
			</div>
			<div className="space-y-2">
				<Label>Title</Label>
				<Input
					placeholder={type === "BOOK" ? "Nahw" : "Tuition Fee"}
					value={title}
					onChange={(event) => setTitle(event.target.value)}
				/>
			</div>
			<div className="space-y-2">
				<Label>Description</Label>
				<Input
					placeholder="Optional note"
					value={description}
					onChange={(event) => setDescription(event.target.value)}
				/>
			</div>
			<Button disabled={createCharge.isPending} type="submit">
				Create Charge
			</Button>
		</form>
	);
}
