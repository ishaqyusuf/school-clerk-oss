"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "@school-clerk/ui/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ModuleSettingsForm } from "./module-settings-form";

export function ModuleSettings({ schoolId, canManage }: { schoolId: string; canManage: boolean }) {
	const trpc = useTRPC();
	const query = useSuspenseQuery(trpc.schoolSettings.getModules.queryOptions({ schoolId }));
	const { access } = query.data;
	const reload = async () => {
		const result = await query.refetch({ throwOnError: true });
		const latest = result.data?.access;
		if (latest?.status !== "configured" || !latest.config) {
			throw new Error("The school does not have a valid module configuration. Contact the platform administrator.");
		}
		return latest.config;
	};

	return (
		<section className="min-w-0 space-y-6 border-b pb-8" aria-labelledby="module-settings-title">
			<div className="space-y-1">
				<h2 id="module-settings-title" className="text-lg font-medium">School modules</h2>
				<p className="max-w-2xl text-sm text-muted-foreground">
					Choose which granted capabilities your school uses. The catalog includes planned capabilities; module grants do not change release availability.
				</p>
			</div>
			{access.status === "configured" && access.config ? (
				<ModuleSettingsForm
					key={schoolId}
					schoolId={schoolId}
					config={access.config}
					canManage={canManage}
					readFailed={query.isError}
					reload={reload}
				/>
			) : (
				<div className="space-y-3">
				<p role="status" className="max-w-2xl text-sm text-muted-foreground">
					{access.status === "invalid"
						? "The saved module configuration is invalid. Contact the platform administrator to restore it; this screen will not overwrite it automatically."
						: "Module controls have not been provisioned for this school. Contact the platform administrator to establish the initial grants and enabled modules."}
				</p>
				{query.isError && <p role="alert" className="text-sm text-destructive">The latest configuration could not be loaded. Please retry.</p>}
				<Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" disabled={query.isFetching} onClick={() => { void query.refetch(); }}>
					{query.isFetching ? "Refreshing…" : "Refresh configuration"}
				</Button>
				</div>
			)}
		</section>
	);
}
