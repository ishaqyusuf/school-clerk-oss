"use client";

import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { FormDate } from "@school-clerk/ui/controls/form-date";
import { FormInput } from "@school-clerk/ui/controls/form-input";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@school-clerk/ui/dialog";
import { Form } from "@school-clerk/ui/form";
import { SubmitButton } from "@school-clerk/ui/submit-button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { z } from "zod";

const academicMetadataSchema = z
	.object({
		title: z.string().trim().min(1, "Name is required"),
		startDate: z.date().nullable(),
		endDate: z.date().optional().nullable(),
		resumptionDate: z.date().optional().nullable(),
	})
	.refine(
		(value) =>
			!value.startDate ||
			!value.endDate ||
			value.endDate.getTime() >= value.startDate.getTime(),
		{
			message: "End date must be on or after the start date",
			path: ["endDate"],
		},
	);

export type AcademicMetadataTarget = {
	kind: "session" | "term";
	id: string;
	title: string;
	startDate: Date | string | null;
	endDate: Date | string | null;
	resumptionDate?: Date | string | null;
	lifecycleStatus?: "DRAFT" | "READY" | "ACTIVE" | "CLOSED" | null;
};

// Resumption dates are calendar days: store them as UTC midnight so every
// timezone prints the same day.
function toCalendarDate(value: Date | string | null | undefined) {
	if (!value) return null;
	const date = new Date(new Date(value).getTime() + 12 * 60 * 60 * 1000);
	return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function toUtcCalendarDate(value: Date | null | undefined) {
	if (!value) return null;
	return new Date(
		Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()),
	);
}

type Props = {
	target: AcademicMetadataTarget | null;
	onOpenChange: (open: boolean) => void;
};

export function EditAcademicMetadataModal({ target, onOpenChange }: Props) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const form = useZodForm(academicMetadataSchema, {
		defaultValues: {
			title: "",
			startDate: null,
			endDate: null,
			resumptionDate: null,
		},
	});

	useEffect(() => {
		if (!target) return;
		form.reset({
			title: target.title,
			startDate: target.startDate ? new Date(target.startDate) : null,
			endDate: target.endDate ? new Date(target.endDate) : null,
			resumptionDate: toCalendarDate(target.resumptionDate),
		});
	}, [form, target]);

	const finishUpdate = async () => {
		await queryClient.invalidateQueries({
			queryKey: trpc.academics.dashboard.queryKey({}),
		});
		onOpenChange(false);
	};

	const updateTerm = useMutation(
		trpc.academics.updateTermMetadata.mutationOptions({
			onSuccess: finishUpdate,
		}),
	);
	const updateSession = useMutation(
		trpc.academics.updateSessionMetadata.mutationOptions({
			onSuccess: finishUpdate,
		}),
	);

	const isPending = updateTerm.isPending || updateSession.isPending;
	const isActiveTerm =
		target?.kind === "term" && target.lifecycleStatus === "ACTIVE";
	const onSubmit = form.handleSubmit((values) => {
		if (!target) return;
		if (target.kind === "term") {
			updateTerm.mutate({
				termId: target.id,
				title: values.title,
				startDate: values.startDate,
				endDate: values.endDate,
				resumptionDate: toUtcCalendarDate(values.resumptionDate),
			});
			return;
		}
		updateSession.mutate({
			sessionId: target.id,
			title: values.title,
			startDate: values.startDate,
			endDate: values.endDate,
		});
	});

	return (
		<Dialog open={!!target} onOpenChange={onOpenChange}>
			<DialogContent
				className="max-w-[455px]"
				onOpenAutoFocus={(event) => event.preventDefault()}
			>
				<DialogHeader>
					<DialogTitle>
						Edit academic {target?.kind === "session" ? "session" : "term"}
					</DialogTitle>
					<DialogDescription>
						{isActiveTerm
							? "Rename the active term or set its resumption date. Its calendar dates are locked."
							: "Update its name, optional calendar dates and resumption date."}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-4">
						<FormInput
							control={form.control}
							name="title"
							label={target?.kind === "session" ? "Session name" : "Term title"}
							placeholder={
								target?.kind === "session" ? "2026/2027" : "Second Term"
							}
						/>
						{!isActiveTerm ? (
							<div className="grid gap-4 sm:grid-cols-2">
								<FormDate
									control={form.control}
									name="startDate"
									label="Start date"
									clearable
									showToday
								/>
								<FormDate
									control={form.control}
									name="endDate"
									label="End date"
									clearable
									showToday
									calendarProps={{
										disabled: (date) => {
											const startDate = form.watch("startDate");
											return !!startDate && date < startDate;
										},
									}}
								/>
							</div>
						) : null}
						{target?.kind === "term" ? (
							<div className="space-y-1.5">
								<FormDate
									control={form.control}
									name="resumptionDate"
									label="Resumption date"
									clearable
								/>
								<p className="text-xs text-muted-foreground">
									Printed on this term's report cards as the date students
									return.
								</p>
							</div>
						) : null}
						<SubmitButton
							type="submit"
							isSubmitting={isPending}
							className="w-full"
						>
							Save changes
						</SubmitButton>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
