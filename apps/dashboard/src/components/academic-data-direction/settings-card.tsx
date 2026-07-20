"use client";

import { SubmitButton } from "@/components/submit-button";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@school-clerk/ui/badge";
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
import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const academicDataDirectionSchema = z.object({
	mode: z.enum(["AUTO", "LTR", "RTL"]),
});

const MODE_OPTIONS = [
	{
		mode: "AUTO" as const,
		label: "Auto-detect",
		description: "Use the dominant direction in current academic data.",
	},
	{
		mode: "LTR" as const,
		label: "Left to right",
		description: "Keep academic tables and cards left to right.",
	},
	{
		mode: "RTL" as const,
		label: "Right to left",
		description: "Mirror academic tables and cards for RTL data.",
	},
];

export function AcademicDataDirectionSettingsCard({
	canManage,
}: {
	canManage: boolean;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const router = useRouter();
	const { data } = useSuspenseQuery(
		trpc.schoolSettings.getAcademicDataDirection.queryOptions(),
	);
	const form = useZodForm(academicDataDirectionSchema, {
		defaultValues: {
			mode: data.mode,
		},
	});
	const updateDirection = useMutation(
		trpc.schoolSettings.updateAcademicDataDirection.mutationOptions({
			async onSuccess(_, variables) {
				if (variables) {
					form.reset({ mode: variables.mode });
				}
				await queryClient.invalidateQueries({
					queryKey: trpc.schoolSettings.getAcademicDataDirection.queryKey(),
				});
				router.refresh();
			},
			meta: {
				toastTitle: {
					error: "Unable to update academic data direction",
					loading: "Updating academic data direction...",
					success: "Academic data direction updated.",
				},
			},
		}),
	);
	const totalWeight = data.ltrWeight + data.rtlWeight;
	const rtlPercent =
		totalWeight > 0 ? Math.round((data.rtlWeight / totalWeight) * 100) : 0;
	const onSubmit = form.handleSubmit((values) => {
		updateDirection.mutate(values);
	});

	return (
		<Form {...form}>
			<form onSubmit={onSubmit} dir="ltr">
				<Card>
					<CardHeader>
				<div className="flex items-start justify-between gap-4">
					<div className="flex min-w-0 items-start gap-3">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
							<Languages className="size-4 text-muted-foreground" />
						</div>
						<div className="space-y-1">
									<CardTitle>Academic data direction</CardTitle>
							<CardDescription>
										Controls rosters, academic tables, and student cards.
								English navigation and controls remain left to right.
							</CardDescription>
						</div>
					</div>
					<Badge variant="outline" className="shrink-0">
								{data.direction === "rtl" ? "Using RTL" : "Using LTR"}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
						<FormField
							control={form.control}
							name="mode"
							render={({ field }) => (
								<FormItem>
									<FormControl>
				<div
					className="grid gap-2 md:grid-cols-3"
					role="radiogroup"
					aria-label="Academic data direction"
				>
					{MODE_OPTIONS.map((option) => {
												const selected = field.value === option.mode;

						return (
							<label
								key={option.mode}
								className={cn(
															"flex min-h-20 items-start rounded-md border border-input bg-background p-3 text-left text-sm transition-colors",
															selected &&
																"border-primary bg-primary/5 ring-1 ring-primary",
															canManage
																? "cursor-pointer hover:bg-accent"
																: "cursor-not-allowed opacity-60",
								)}
							>
								<input
									type="radio"
									value={option.mode}
									checked={selected}
															disabled={!canManage}
															onChange={() => field.onChange(option.mode)}
									className="sr-only"
								/>
								<span className="flex min-w-0 flex-1 items-start gap-2">
										<span
											className={cn(
												"mt-1 size-2 shrink-0 rounded-full bg-muted-foreground/30",
												selected && "bg-primary",
											)}
										/>
									<span className="space-y-1">
																<span className="block font-medium">
											{option.label}
										</span>
																<span className="block text-xs text-muted-foreground">
											{option.description}
										</span>
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

				<div className="rounded-lg border bg-muted/25 p-3 text-sm">
							{data.analyzedRecords > 0 ? (
						<p>
									Detection analyzed {data.analyzedRecords} academic values;{" "}
									{rtlPercent}% of the weighted evidence was RTL.
						</p>
					) : (
						<p>
									There is not enough directional academic data yet, so
									automatic mode defaults to LTR.
						</p>
					)}
				</div>
			</CardContent>
					<CardFooter className="flex justify-between gap-4">
						<p className="text-xs text-muted-foreground">
							{!canManage
								? "Only school administrators can change this setting."
								: "This does not change the dashboard language."}
						</p>
						<SubmitButton
							type="submit"
							isSubmitting={updateDirection.isPending}
							disabled={
								!canManage ||
								!form.formState.isDirty ||
								updateDirection.isPending
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
