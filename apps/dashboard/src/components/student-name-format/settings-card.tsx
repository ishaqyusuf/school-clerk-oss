"use client";

import { SubmitButton } from "@/components/submit-button";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@school-clerk/ui/card";
import { cn } from "@school-clerk/ui/cn";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormMessage,
} from "@school-clerk/ui/form";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const studentNameFormatSchema = z.object({
	format: z.enum([
		"FIRST_SURNAME_OTHER",
		"SURNAME_FIRST_OTHER",
		"FIRST_OTHER_SURNAME",
	]),
});

const FORMAT_OPTIONS = [
	{
		format: "FIRST_SURNAME_OTHER" as const,
		label: "First · Surname · Other",
		example: "Amina Bello Zainab",
	},
	{
		format: "SURNAME_FIRST_OTHER" as const,
		label: "Surname · First · Other",
		example: "Bello Amina Zainab",
	},
	{
		format: "FIRST_OTHER_SURNAME" as const,
		label: "First · Other · Surname",
		example: "Amina Zainab Bello",
	},
];

export function StudentNameFormatSettingsCard({
	canManage,
}: {
	canManage: boolean;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const router = useRouter();
	const { data } = useSuspenseQuery(
		trpc.schoolSettings.getGeneral.queryOptions(),
	);
	const form = useZodForm(studentNameFormatSchema, {
		defaultValues: {
			format: data.studentNameFormat,
		},
	});
	const updateNameFormat = useMutation(
		trpc.schoolSettings.updateStudentNameFormat.mutationOptions({
			async onSuccess(_, variables) {
				if (variables) {
					form.reset({ format: variables.format });
				}
				await queryClient.invalidateQueries({
					queryKey: trpc.schoolSettings.getGeneral.queryKey(),
				});
				router.refresh();
			},
			meta: {
				toastTitle: {
					error: "Unable to update student name format",
					loading: "Updating student name format...",
					success: "Student name format updated.",
				},
			},
		}),
	);

	const onSubmit = form.handleSubmit((values) => {
		updateNameFormat.mutate(values);
	});

	return (
		<Form {...form}>
			<form onSubmit={onSubmit}>
				<Card>
					<CardHeader>
						<div className="flex items-start gap-3">
							<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
								<UserRound className="size-4 text-muted-foreground" />
							</div>
							<div className="space-y-1">
								<CardTitle>Student name format</CardTitle>
								<CardDescription>
									Choose one consistent display order for student names across
									directories, reports, finance, exports, and documents.
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<FormField
							control={form.control}
							name="format"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<div
											className="grid gap-2"
											role="radiogroup"
											aria-label="Student name format"
										>
											{FORMAT_OPTIONS.map((option) => {
												const selected = field.value === option.format;

												return (
													<label
														key={option.format}
														className={cn(
															"flex min-h-16 items-center gap-3 rounded-md border border-input bg-background p-3 text-sm transition-colors",
															selected &&
																"border-primary bg-primary/5 ring-1 ring-primary",
															canManage
																? "cursor-pointer hover:bg-accent"
																: "cursor-not-allowed opacity-60",
														)}
													>
														<input
															type="radio"
															value={option.format}
															checked={selected}
															disabled={!canManage}
															onChange={() => field.onChange(option.format)}
															className="sr-only"
														/>
														<span
															className={cn(
																"size-2 shrink-0 rounded-full bg-muted-foreground/30",
																selected && "bg-primary",
															)}
														/>
														<span className="min-w-0 flex-1">
															<span className="block font-medium">
																{option.label}
															</span>
															<span className="block text-xs text-muted-foreground">
																Example: {option.example}
															</span>
														</span>
													</label>
												);
											})}
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</CardContent>
					<CardFooter className="flex justify-between gap-4">
						<p className="text-xs text-muted-foreground">
							{canManage
								? "Missing other names are omitted automatically."
								: "Only school administrators can change this setting."}
						</p>
						<SubmitButton
							type="submit"
							isSubmitting={updateNameFormat.isPending}
							disabled={
								!canManage ||
								!form.formState.isDirty ||
								updateNameFormat.isPending
							}
						>
							Save
						</SubmitButton>
					</CardFooter>
				</Card>
			</form>
		</Form>
	);
}
