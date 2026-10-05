"use client";

import { Button } from "@school-clerk/ui/button";

export function ModuleAccessNotice({ status, canManage, isFetching, onRetry }: {
	status: "loading" | "error" | "unconfigured" | "invalid" | "configured";
	canManage: boolean;
	isFetching: boolean;
	onRetry: () => void;
}) {
	if (status === "configured") return null;
	const message = status === "loading"
		? "Loading module access…"
		: status === "error"
			? "Module access could not be loaded. Navigation is limited until it can be refreshed."
			: status === "invalid"
				? "This school's module configuration needs administrator attention. Module navigation is unavailable; settings and account access remain available."
				: canManage
					? "School modules must be provisioned before module access is available. School settings and account access remain available."
					: "School modules must be provisioned before module access is available. Contact your school administrator.";
	return (
		<div className="mb-4 flex min-w-0 flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
			<p role="status" aria-live="polite" className="min-w-0 break-words text-sm text-muted-foreground">{message}</p>
			{status === "error" && (
				<Button type="button" variant="outline" className="min-h-11 w-full shrink-0 sm:w-auto" disabled={isFetching} onClick={onRetry}>
					{isFetching ? "Refreshing…" : "Retry module access"}
				</Button>
			)}
		</div>
	);
}
