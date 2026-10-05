"use client";

import { SubmitButton } from "@/components/submit-button";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import {
	Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@school-clerk/ui/form";
import {
	Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@school-clerk/ui/select";
import {
	INSTITUTION_TYPES, INSTITUTION_TYPE_LABELS, institutionSettingsSchema,
	type InstitutionType,
} from "@school-clerk/utils/institution-config";
import {
	useMutation, useQueryClient, useSuspenseQuery,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export function InstitutionSettings({ canManage }: { canManage: boolean }) {
	const trpc = useTRPC();
	const { data } = useSuspenseQuery(trpc.schoolSettings.getInstitution.queryOptions());
	return (
		<InstitutionSettingsForm
			key={data.schoolId}
			institutionType={data.institutionType}
			storedInstitutionType={data.storedInstitutionType}
			canManage={canManage}
		/>
	);
}

function InstitutionSettingsForm({ institutionType, storedInstitutionType, canManage }: {
	institutionType: InstitutionType | null;
	storedInstitutionType: string | null;
	canManage: boolean;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const router = useRouter();
	const form = useZodForm(institutionSettingsSchema, {
		defaultValues: { institutionType: institutionType ?? undefined },
	});
	const mutation = useMutation(trpc.schoolSettings.updateInstitution.mutationOptions({
		async onSuccess(result) {
			form.reset({ institutionType: result.institutionType });
			await queryClient.invalidateQueries({
				queryKey: trpc.schoolSettings.getInstitution.queryKey(),
			});
			router.refresh();
		},
		meta: { toastTitle: {
			loading: "Updating institution type...",
			success: "Institution type updated.",
			error: "Unable to update institution type",
		} },
	}));
	const onSubmit = form.handleSubmit((values) => {
		if (!canManage || mutation.isPending) return;
		mutation.mutate(values);
	});

	return (
		<section aria-labelledby="institution-settings-title" className="min-w-0 space-y-6 border-b pb-8">
			<div className="space-y-1">
				<h2 id="institution-settings-title" className="text-lg font-medium">Institution type</h2>
				<p className="max-w-2xl text-sm text-muted-foreground">Classify your institution without changing its academic records, enabled modules, or subscription.</p>
			</div>
			{!institutionType && (
				<p className="max-w-2xl break-words text-sm text-muted-foreground">
					This institution is unclassified.{storedInstitutionType ? ` Its existing value “${storedInstitutionType}” is preserved until an administrator chooses a supported type.` : " Choose a supported type to complete this setting."}
				</p>
			)}
			<Form {...form}>
				<form onSubmit={onSubmit} className="min-w-0 max-w-2xl space-y-4" aria-busy={mutation.isPending}>
					<FormField control={form.control} name="institutionType" render={({ field }) => (
						<FormItem className="min-w-0 max-w-md">
							<FormLabel>Institution category</FormLabel>
							<Select name={field.name} value={field.value ?? ""} onValueChange={field.onChange} disabled={!canManage || mutation.isPending}>
								<FormControl>
									<SelectTrigger ref={field.ref} onBlur={field.onBlur} hideIcon className="min-h-11 w-full min-w-0 text-base focus-visible:ring-2 focus-visible:ring-ring sm:text-sm">
										<SelectValue placeholder="Choose an institution type" />
									</SelectTrigger>
								</FormControl>
								<SelectContent className="max-h-[min(24rem,60dvh)] max-w-[calc(100vw-2rem)]">
									{INSTITUTION_TYPES.map((type) => (
										<SelectItem key={type} value={type} className="min-h-11">
											{INSTITUTION_TYPE_LABELS[type]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FormDescription>K–12 keeps a combined primary and secondary school together.</FormDescription>
							<FormMessage />
						</FormItem>
					)} />
					{mutation.isError && (
						<p role="alert" className="break-words text-sm text-destructive">
							{mutation.error.message}
						</p>
					)}
					<div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-sm text-muted-foreground">{canManage ? "This does not activate new modules or purchase add-ons." : "Only school administrators can change this setting."}</p>
						{canManage && (
							<SubmitButton
								type="submit"
								className="min-h-11 w-full shrink-0 sm:w-auto"
								isSubmitting={mutation.isPending}
								disabled={!form.formState.isDirty}
							>
								Save institution type
							</SubmitButton>
						)}
					</div>
					<p role="status" aria-live="polite" className="text-sm text-muted-foreground">
						{mutation.isPending
							? "Saving institution type…"
							: mutation.isSuccess && !form.formState.isDirty
								? "Institution type saved."
								: ""}
					</p>
				</form>
			</Form>
		</section>
	);
}
