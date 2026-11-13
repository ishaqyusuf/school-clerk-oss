"use client";

import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { FormDate } from "@school-clerk/ui/controls/form-date";
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
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { z } from "zod";

export type StudentTermOption = { termId: string; term: string };

const formSchema = z.object({
	withdrawalTermId: z.string().min(1, "Choose the term the student last attended"),
	lastEnrolledDate: z.date({ required_error: "Choose the last day attended" }),
	reason: z.string().trim().min(3, "Enter a reason").max(500),
	note: z.string().trim().max(2000).optional(),
});

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	studentId: string;
	terms: StudentTermOption[];
	defaultTermId?: string | null;
	onSuccess: () => void;
};

export function StudentWithdrawModal({
	open,
	onOpenChange,
	studentId,
	terms,
	defaultTermId,
	onSuccess,
}: Props) {
	const trpc = useTRPC();
	const form = useZodForm(formSchema, {
		defaultValues: {
			withdrawalTermId: defaultTermId ?? "",
			lastEnrolledDate: undefined,
			reason: "",
			note: "",
		},
	});

	const withdrawMutation = useMutation(
		trpc.students.withdrawStudent.mutationOptions({
			retry: false,
			networkMode: "always",
			onSuccess(result) {
				toast({
					title: "Student withdrawn",
					description:
						result && (result.archived || result.flagged)
							? `${result.archived} later-term enrollment(s) archived, ${result.flagged} kept for review.`
							: "They leave active rosters after their last day.",
				});
				onOpenChange(false);
				onSuccess();
			},
		}),
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the modal opens.
	useEffect(() => {
		if (!open) return;
		withdrawMutation.reset();
		form.reset({
			withdrawalTermId: defaultTermId ?? "",
			lastEnrolledDate: new Date(new Date().setHours(0, 0, 0, 0)),
			reason: "",
			note: "",
		});
	}, [open, defaultTermId]);

	const onSubmit = form.handleSubmit((values) => {
		withdrawMutation.mutate({
			studentId,
			withdrawalTermId: values.withdrawalTermId,
			lastEnrolledDate: values.lastEnrolledDate,
			reason: values.reason,
			note: values.note || null,
		});
	});

	return (
		<Dialog
			open={open}
			onOpenChange={(value) => !withdrawMutation.isPending && onOpenChange(value)}
		>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Withdraw student</DialogTitle>
					<DialogDescription>
						They leave active rosters after their last day and can&apos;t be enrolled in later terms
						until readmitted. Nothing is deleted.
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-4">
						<div className="grid gap-4">
							<FormSelect
								control={form.control}
								name="withdrawalTermId"
								label="Term"
								placeholder="Select term"
								options={terms}
								valueKey="termId"
								titleKey="term"
							/>
							<FormDate
								control={form.control}
								name="lastEnrolledDate"
								label="Last day attended"
								showToday
							/>
						</div>
						<FormInput
							control={form.control}
							name="reason"
							label="Reason"
							type="textarea"
							placeholder="Family relocated to another state"
						/>
						<FormInput
							control={form.control}
							name="note"
							label="Note (optional)"
							type="textarea"
						/>
						{withdrawMutation.error ? (
							<p role="alert" className="text-sm text-destructive">
								{withdrawMutation.error.message}
							</p>
						) : null}
						<SubmitButton
							type="submit"
							isSubmitting={withdrawMutation.isPending}
							className="w-full"
						>
							Withdraw student
						</SubmitButton>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
