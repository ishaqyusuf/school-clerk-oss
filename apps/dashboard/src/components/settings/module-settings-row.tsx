"use client";

import { Checkbox } from "@school-clerk/ui/checkbox";
import {
	MODULE_CATALOG,
	type ModuleId,
	type ModuleAccessIssue,
} from "@school-clerk/utils/module-config";

export function ModuleSettingsRow({
	controlId,
	moduleId,
	checked,
	entitled,
	disabled,
	issue,
	onCheckedChange,
}: {
	controlId: string;
	moduleId: ModuleId;
	checked: boolean;
	entitled: boolean;
	disabled: boolean;
	issue?: ModuleAccessIssue;
	onCheckedChange: (checked: boolean) => void;
}) {
	const definition = MODULE_CATALOG[moduleId];
	const id = `${controlId}-${moduleId}`;
	const dependencyLabels = definition.dependencies
		.map((dependency) => MODULE_CATALOG[dependency].label);

	return (
		<div className="min-w-0 space-y-1 border-b py-3 last:border-b-0">
			<label htmlFor={id} className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
				<span className="min-w-0 break-words text-sm font-medium">{definition.label}</span>
				<Checkbox
					id={id}
					checked={checked}
					disabled={disabled || (!entitled && !checked)}
					onCheckedChange={(value) => onCheckedChange(value === true)}
					aria-describedby={`${id}-description ${id}-availability${issue?.reason === "MISSING_DEPENDENCY" ? ` ${id}-issue` : ""}`}
					aria-invalid={!!issue}
					className="size-5 shrink-0 focus-visible:ring-2"
				/>
			</label>
			<p id={`${id}-description`} className="break-words text-sm text-muted-foreground">
				{definition.description}
			</p>
			<p id={`${id}-availability`} className="break-words text-xs text-muted-foreground">
				{!entitled
					? "Not granted to this school. An administrator cannot activate it here."
					: dependencyLabels.length > 0
						? `Requires ${dependencyLabels.join(", ")}.`
						: "Granted to this school."}
			</p>
			{issue?.reason === "MISSING_DEPENDENCY" && (
				<p id={`${id}-issue`} className="break-words text-xs text-destructive">
					Enable {issue.dependencies.map((dependency) => MODULE_CATALOG[dependency].label).join(", ")}, or deselect this module.
				</p>
			)}
		</div>
	);
}
