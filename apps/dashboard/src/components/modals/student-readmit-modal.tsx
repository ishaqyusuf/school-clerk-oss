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
import type { StudentTermOption } from "./student-withdraw-modal";

const formSchema = z.object({
	readmissionTermId: z.string().min(1, "Choose the term they return in"),
	readmittedOn: z.date({ required_error: "Choose the return date" }),
	note: z.string().trim().max(2000).optional(),
});

type Props = {
	/** The open withdrawal to close; the modal is open while this is set. */
	withdrawalId: string | null;
	onOpenChange: (open: boolean) => void;
	studentId: string;
	terms: StudentTermOption[];
	onSuccess: () => void;
};

export function StudentReadmitModal({
	withdrawalId,
	onOpenChange,
	studentId,
	terms,
	onSuccess,
}: Props) {
	const trpc = useTRPC();
	const open = Boolean(withdrawalId);
	const form = useZodForm(formSchema, {
		defaultValues: { readmissionTermId: "", readmittedOn: undefined, note: "" },
	});

	const readmitMutation = useMutation(
		trpc.students.readmitStudent.mutationOptions({
			retry: false,
			networkMode: "always",
			onSuccess() {
				toast({
					title: "Student readmitted",
					description: "Enroll them in a class for the readmission term. Missed terms stay empty.",
				});
				onOpenChange(false);
				onSuccess();
			},
		}),
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the modal opens.
	useEffect(() => {
		if (!open) return;
		readmitMutation.reset();
		form.reset({
			readmissionTermId: "",
			readmittedOn: new Date(new Date().setHours(0, 0, 0, 0)),
			note: "",
		});
	}, [open]);

	const onSubmit = form.handleSubmit((values) => {
		if (!withdrawalId) return;
		readmitMutation.mutate({
			studentId,
			withdrawalId,
			readmissionTermId: values.readmissionTermId,
			readmittedOn: values.readmittedOn,
			note: values.note || null,
		});
	});

	return (
		<Dialog open={open} onOpenChange={(value) => !readmitMutation.isPending && onOpenChange(value)}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Readmit student</DialogTitle>
					<DialogDescription>
						Reuses their existing profile. Terms they missed are not filled in.
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-4">
						<div className="grid gap-4">
							<FormSelect
								control={form.control}
								name="readmissionTermId"
								label="Term"
								placeholder="Select term"
								options={terms}
								valueKey="termId"
								titleKey="term"
							/>
							<FormDate control={form.control} name="readmittedOn" label="Returns on" showToday />
						</div>
						<FormInput control={form.control} name="note" label="Note (optional)" type="textarea" />
						{readmitMutation.error ? (
							<p role="alert" className="text-sm text-destructive">
								{readmitMutation.error.message}
							</p>
						) : null}
						<SubmitButton type="submit" isSubmitting={readmitMutation.isPending} className="w-full">
							Readmit student
						</SubmitButton>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
