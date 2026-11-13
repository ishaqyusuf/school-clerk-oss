"use client";

import { useZodForm } from "@/hooks/use-zod-form";
import { formatNaira } from "@/components/finance/student-payment-allocation";
import { useTRPC } from "@/trpc/client";
import { Button } from "@school-clerk/ui/button";
import { ComboboxDropdown } from "@school-clerk/ui/combobox-dropdown";
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
import { Label } from "@school-clerk/ui/label";
import { SubmitButton } from "@school-clerk/ui/submit-button";
import { toast } from "@school-clerk/ui/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";

const PRESETS = ["Uniform", "Textbooks", "Exercise Books", "Stationery", "PE Kit", "School Bag"];

const PAYMENT_METHODS = [
	{ value: "Cash", label: "Cash" },
	{ value: "Bank Transfer", label: "Bank transfer" },
	{ value: "Card", label: "Card (POS)" },
];

const formSchema = z.object({
	title: z.string().trim().min(1, "Choose or type an item"),
	amount: z.number({ invalid_type_error: "Enter an amount" }).positive("Enter an amount above zero"),
	paymentMethod: z.string().min(1),
	description: z.string().trim().max(500).optional(),
});

const EMPTY = { title: "", amount: undefined, paymentMethod: "Cash", description: "" };

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	studentId: string;
	studentTermFormId?: string | null;
	onSuccess: () => void;
};

export function StudentPurchaseModal({ open, onOpenChange, studentId, studentTermFormId, onSuccess }: Props) {
	const trpc = useTRPC();
	const [search, setSearch] = useState("");
	const form = useZodForm(formSchema, { defaultValues: EMPTY });

	const { data: suggestions = [] } = useQuery(
		trpc.finance.getStudentPurchaseSuggestions.queryOptions(
			{ query: search || undefined },
			{ enabled: open && Boolean(studentTermFormId) },
		),
	);

	const purchase = useMutation(
		trpc.finance.createStudentPurchase.mutationOptions({
			retry: false,
			onSuccess() {
				toast({ title: "Purchase recorded", description: "It was paid in full and added to this term." });
				onOpenChange(false);
				onSuccess();
			},
		}),
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the modal opens.
	useEffect(() => {
		if (!open) return;
		purchase.reset();
		setSearch("");
		form.reset(EMPTY);
	}, [open]);

	const [title, amount, description] = form.watch(["title", "amount", "description"]);
	const titleError = form.formState.errors.title?.message;

	const pickItem = (value: { title: string; amount?: number | null; description?: string | null }) => {
		form.setValue("title", value.title, { shouldValidate: true });
		if (value.amount) form.setValue("amount", value.amount, { shouldValidate: true });
		if (value.description !== undefined) form.setValue("description", value.description ?? "");
	};

	const onSubmit = form.handleSubmit((values) => {
		if (!studentTermFormId) return;
		purchase.mutate({
			studentId,
			studentTermFormId,
			title: values.title,
			description: values.description || undefined,
			amount: values.amount,
			paid: true,
			paymentMethod: values.paymentMethod,
		});
	});

	return (
		<Dialog open={open} onOpenChange={(value) => !purchase.isPending && onOpenChange(value)}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Record purchase</DialogTitle>
					<DialogDescription>For items the student paid for on the spot, like uniforms or books.</DialogDescription>
				</DialogHeader>

				{!studentTermFormId ? (
					<p className="text-sm text-muted-foreground">Enroll the student in this term before recording purchases.</p>
				) : (
					<Form {...form}>
						<form onSubmit={onSubmit} className="space-y-4">
							<div className="space-y-2">
								<Label>Item</Label>
								<ComboboxDropdown
									items={suggestions.map((item) => ({
										id: item.id,
										label: item.title,
										description: item.description,
										amount: item.amount,
									}))}
									selectedItem={
										title ? { id: title, label: title, description, amount: Number(amount || 0) } : null
									}
									placeholder="Search or type an item"
									searchPlaceholder="Search previous items…"
									onSearch={setSearch}
									onSelect={(item) =>
										pickItem({ title: item.label, amount: item.amount, description: item.description })
									}
									onCreate={(value) => pickItem({ title: value.trim() })}
									renderOnCreate={(value) => <span>Use “{value}” as a new item</span>}
									renderSelectedItem={(item) => <span>{item.label}</span>}
									renderListItem={({ item }) => (
										<div className="flex w-full items-center justify-between gap-3">
											<span className="min-w-0 truncate">{item.label}</span>
											<span className="shrink-0 text-xs tabular-nums text-muted-foreground">
												{formatNaira(Number(item.amount || 0))}
											</span>
										</div>
									)}
								/>
								<div className="flex flex-wrap gap-1.5">
									{PRESETS.map((preset) => (
										<Button
											key={preset}
											type="button"
											size="xs"
											variant={title === preset ? "secondary" : "outline"}
											onClick={() => pickItem({ title: preset })}
										>
											{preset}
										</Button>
									))}
								</div>
								{titleError ? <p className="text-sm text-destructive">{titleError}</p> : null}
							</div>
							<div className="grid gap-4 sm:grid-cols-2">
								<FormInput control={form.control} name="amount" label="Amount (NGN)" type="number" placeholder="0" />
								<FormSelect
									control={form.control}
									name="paymentMethod"
									label="Paid by"
									options={PAYMENT_METHODS}
									valueKey="value"
									titleKey="label"
								/>
							</div>
							<FormInput control={form.control} name="description" label="Note (optional)" />
							{purchase.error ? (
								<p role="alert" className="text-sm text-destructive">
									{purchase.error.message}
								</p>
							) : null}
							<SubmitButton type="submit" isSubmitting={purchase.isPending} className="w-full">
								Record purchase
							</SubmitButton>
						</form>
					</Form>
				)}
			</DialogContent>
		</Dialog>
	);
}
