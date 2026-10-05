"use client";

import { SubmitButton } from "@/components/submit-button";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { Button } from "@school-clerk/ui/button";
import { Form, FormField, FormItem, FormMessage } from "@school-clerk/ui/form";
import {
	MODULE_IDS,
	evaluateModuleSelection,
	updateEnabledModulesSchema,
	type ModuleConfig,
	type ModuleId,
} from "@school-clerk/utils/module-config";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useWatch } from "react-hook-form";
import { ModuleSettingsRow } from "./module-settings-row";

const MODULE_GROUPS: { title: string; modules: ModuleId[] }[] = [
	{ title: "Records and structure", modules: ["STUDENT_MANAGEMENT", "STAFF_MANAGEMENT", "ACADEMIC_PROGRAMS", "COURSES_SUBJECTS", "ADMISSION_ENROLLMENT"] },
	{ title: "Teaching and learning", modules: ["ATTENDANCE", "ASSESSMENT_AND_EXAMS", "RESULTS_AND_REPORTS", "TIMETABLE", "ASSIGNMENTS", "EXTERNAL_EXAMS"] },
	{ title: "School operations", modules: ["BILLING_FINANCE", "INVENTORY_ASSETS", "LIBRARY", "HOSTEL", "TRANSPORT"] },
	{ title: "Family and communication", modules: ["PARENT_PORTAL", "COMMUNICATION", "AI_ASSISTANT"] },
];

function formValues(config: ModuleConfig) {
	return {
		revision: config.revision,
		enabledModules: MODULE_IDS.filter((id) => config.enabledModules.includes(id)),
	};
}

export function ModuleSettingsForm({ schoolId, config, canManage, readFailed, reload }: {
	schoolId: string;
	config: ModuleConfig;
	canManage: boolean;
	readFailed: boolean;
	reload: () => Promise<ModuleConfig>;
}) {
	const controlId = useId();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const router = useRouter();
	const [isReloading, setIsReloading] = useState(false);
	const [reloadError, setReloadError] = useState<string | null>(null);
	const form = useZodForm(updateEnabledModulesSchema, { defaultValues: formValues(config) });
	const enabledModules = useWatch({ control: form.control, name: "enabledModules" });
	const revision = useWatch({ control: form.control, name: "revision" });
	const selection = evaluateModuleSelection({ enabledModules, entitledModules: config.entitledModules });
	const selectionInvalid = selection.status !== "configured" || selection.issues.length > 0;
	const stale = config.revision > revision;
	const mutation = useMutation(trpc.schoolSettings.updateModules.mutationOptions({
		async onSuccess(result) {
			if (!result.access.config) {
				form.setError("root", { message: "The saved configuration could not be read. Reload before continuing." });
				return;
			}
			form.reset(formValues(result.access.config));
			setReloadError(null);
			const options = trpc.schoolSettings.getModules.queryOptions({ schoolId });
			queryClient.setQueryData(options.queryKey, (previous) => previous
				? { ...previous, access: result.access }
				: previous);
			await queryClient.invalidateQueries({ queryKey: options.queryKey });
			router.refresh();
		},
		meta: { toastTitle: {
			loading: "Saving module settings...",
			success: "Module settings saved.",
			error: "Unable to save module settings",
		} },
	}));
	const conflict = mutation.error?.data?.code === "CONFLICT";
	const editingDisabled = !canManage || mutation.isPending || isReloading || stale || conflict || readFailed;
	const onSubmit = form.handleSubmit((values) => {
		if (editingDisabled || selectionInvalid) return;
		mutation.mutate({ schoolId, ...values });
	});
	const reloadLatest = async () => {
		setIsReloading(true);
		setReloadError(null);
		try {
			const latest = await reload();
			form.reset(formValues(latest));
			mutation.reset();
		} catch (error) {
			setReloadError(error instanceof Error ? error.message : "Unable to reload module settings.");
		} finally {
			setIsReloading(false);
		}
	};

	return (
		<Form {...form}>
			<form onSubmit={onSubmit} className="min-w-0 space-y-6" aria-busy={mutation.isPending || isReloading}>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<p className="text-sm text-muted-foreground" role="status" aria-live="polite">
						{enabledModules.length} selected · {selection.effectiveModules.length} enabled by policy
					</p>
					<Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" onClick={reloadLatest} disabled={mutation.isPending || isReloading}>
						{isReloading ? "Reloading…" : form.formState.isDirty ? "Reload and discard edits" : "Reload latest"}
					</Button>
				</div>
				{(stale || conflict || readFailed) && (
					<p role="alert" className="text-sm text-destructive">
						{readFailed ? "The latest configuration could not be loaded." : "Module settings have changed since this form was loaded."}
						{" "}Reload the latest configuration before saving. Reloading discards your unsaved choices.
					</p>
				)}
				<FormField control={form.control} name="enabledModules" render={({ field }) => (
					<FormItem>
						<div className="grid min-w-0 gap-x-10 gap-y-8 lg:grid-cols-2">
							{MODULE_GROUPS.map((group) => (
								<fieldset key={group.title} className="min-w-0">
									<legend className="mb-2 text-sm font-medium">{group.title}</legend>
									{group.modules.map((moduleId) => (
										<ModuleSettingsRow
											key={moduleId}
											controlId={controlId}
											moduleId={moduleId}
											checked={field.value.includes(moduleId)}
											entitled={config.entitledModules.includes(moduleId)}
											disabled={editingDisabled}
											issue={selection.issues.find((issue) => issue.moduleId === moduleId)}
											onCheckedChange={(checked) => field.onChange(MODULE_IDS.filter((id) => id === moduleId ? checked : field.value.includes(id)))}
										/>
									))}
								</fieldset>
							))}
						</div>
						<FormMessage />
					</FormItem>
				)} />
				{selectionInvalid && <p role="status" className="text-sm text-destructive">Resolve the grant or dependency warnings above before saving.</p>}
				{(reloadError || mutation.error || form.formState.errors.root || form.formState.errors.revision) && (
					<p role="alert" className="break-words text-sm text-destructive">
						{reloadError ?? mutation.error?.message ?? form.formState.errors.root?.message ?? form.formState.errors.revision?.message}
					</p>
				)}
				<div className="flex flex-col items-stretch gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
					<p className="max-w-xl text-sm text-muted-foreground">
						{canManage ? "Disabling a module preserves its data. This form does not purchase add-ons or grant new entitlements." : "Only school administrators can change enabled modules."}
					</p>
					{canManage && <SubmitButton type="submit" className="min-h-11 w-full shrink-0 sm:w-auto" isSubmitting={mutation.isPending} disabled={editingDisabled || selectionInvalid || !form.formState.isDirty}>Save module settings</SubmitButton>}
				</div>
				<p role="status" aria-live="polite" className="text-sm text-muted-foreground">
					{mutation.isPending ? "Saving module settings…" : mutation.isSuccess && !form.formState.isDirty ? "Module settings saved." : ""}
				</p>
			</form>
		</Form>
	);
}
