"use client";

import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { FormInput } from "@school-clerk/ui/controls/form-input";
import { FormSelect } from "@school-clerk/ui/controls/form-select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@school-clerk/ui/dialog";
import { Form } from "@school-clerk/ui/form";
import { SubmitButton } from "@school-clerk/ui/submit-button";
import { toast } from "@school-clerk/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { z } from "zod";

const CHARGE_TYPES = [
	{ value: "TUITION_FEE", label: "Tuition fee" },
	{ value: "BOOK", label: "Book" },
	{ value: "OTHER", label: "Other" },
] as const;

const formSchema = z.object({
	type: z.enum(["TUITION_FEE", "BOOK", "OTHER"]),
	title: z.string().trim().min(1, "Enter a title"),
	amount: z.number({ invalid_type_error: "Enter an amount" }).positive("Enter an amount above zero"),
	description: z.string().trim().max(500).optional(),
});

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	studentId: string;
	termId: string;
	studentTermId?: string | null;
};

export function StudentChargeModal({ open, onOpenChange, studentId, termId, studentTermId }: Props) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const form = useZodForm(formSchema, {
		defaultValues: { type: "TUITION_FEE", title: "Tuition fee", amount: undefined, description: "" },
	});

	const createCharge = useMutation(
		trpc.finance.createCharge.mutationOptions({
			retry: false,
			async onSuccess() {
				toast({ title: "Charge added", description: "It now shows in this term's fees." });
				onOpenChange(false);
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.finance.getReceivePaymentData.queryKey({ studentId }),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.finance.getStudentPayments.queryKey({ studentId, termId }),
					}),
					queryClient.invalidateQueries({ queryKey: trpc.finance.overview.queryKey() }),
					queryClient.invalidateQueries({ queryKey: trpc.finance.getWorkspaceSummary.queryKey() }),
					queryClient.invalidateQueries({ queryKey: trpc.finance.getAccounts.queryKey() }),
				]);
			},
		}),
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the modal opens.
	useEffect(() => {
		if (!open) return;
		createCharge.reset();
		form.reset({ type: "TUITION_FEE", title: "Tuition fee", amount: undefined, description: "" });
	}, [open]);

	const type = form.watch("type");

	const onSubmit = form.handleSubmit((values) => {
		createCharge.mutate({
			payerType: "STUDENT",
			studentId,
			studentTermFormId: studentTermId,
			termId,
			type: values.type,
			title: values.title,
			description: values.description || null,
			amount: values.amount,
			collectionStatus: values.type === "BOOK" ? "NOT_COLLECTED" : "NOT_REQUIRED",
		});
	});

	return (
		<Dialog open={open} onOpenChange={(value) => !createCharge.isPending && onOpenChange(value)}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Add charge</DialogTitle>
					<DialogDescription>
						Bill this student for the selected term. It adds to their balance straight away.
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<FormSelect
								control={form.control}
								name="type"
								label="Type"
								options={[...CHARGE_TYPES]}
								valueKey="value"
								titleKey="label"
							/>
							<FormInput control={form.control} name="amount" label="Amount (NGN)" type="number" placeholder="0" />
						</div>
						<FormInput
							control={form.control}
							name="title"
							label="Title"
							placeholder={type === "BOOK" ? "Nahw" : "Tuition fee"}
						/>
						<FormInput control={form.control} name="description" label="Note (optional)" />
						{createCharge.error ? (
							<p role="alert" className="text-sm text-destructive">
								{createCharge.error.message}
							</p>
						) : null}
						<SubmitButton type="submit" isSubmitting={createCharge.isPending} className="w-full">
							Add charge
						</SubmitButton>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
