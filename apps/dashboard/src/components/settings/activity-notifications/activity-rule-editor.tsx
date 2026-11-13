"use client";

import { ActivityAvatar } from "@/components/activity/activity-visuals";
import { ACTIVITY_CATEGORY_LABELS } from "@school-clerk/notifications/activities";
import { Button } from "@school-clerk/ui/button";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { cn } from "@school-clerk/ui/cn";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@school-clerk/ui/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@school-clerk/ui/drawer";
import { useIsMobile } from "@school-clerk/ui/hooks/use-mobile";
import { Label } from "@school-clerk/ui/label";
import { Switch } from "@school-clerk/ui/switch";
import { Bell, Check, Mail, Plus } from "lucide-react";
import { type ReactNode, useId, useRef } from "react";
import { roleLabel } from "./activity-rule-card";
import { summarizeActivityRule } from "./rule-summary";
import type {
	ActivityRule,
	ActivityRuleOptions,
	ActivityRulePatch,
} from "./use-activity-rule-saver";

function toggle(list: readonly string[], value: string) {
	return list.includes(value)
		? list.filter((entry) => entry !== value)
		: [...list, value];
}

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="mt-5">
			<h4 className="mb-2.5 text-[12.5px] font-semibold text-muted-foreground">
				{title}
			</h4>
			{children}
		</section>
	);
}

function RuleEditorBody({
	rule,
	options,
	onChange,
}: {
	rule: ActivityRule;
	options: ActivityRuleOptions | undefined;
	onChange: (patch: ActivityRulePatch) => void;
}) {
	const id = useId();
	const summary = summarizeActivityRule(rule);
	const nobody = rule.enabled && !rule.roles.length && !rule.userIds.length;
	const noDelivery = rule.enabled && !rule.inApp && !rule.email;
	const members = options?.members ?? [];
	const roles = options?.roles ?? [];

	return (
		<div>
			<div className="flex min-h-12 items-center gap-3 border-b pb-3.5">
				<div className="min-w-0 flex-1">
					<Label htmlFor={`${id}-master`} className="block font-semibold">
						Notify people
					</Label>
					<p
						id={`${id}-master-summary`}
						className={cn(
							"mt-0.5 text-[12.5px]",
							summary.warn
								? "text-amber-600 dark:text-amber-400"
								: "text-muted-foreground",
						)}
					>
						{rule.enabled ? summary.text : "Off · recorded on Activity only"}
					</p>
				</div>
				<Switch
					id={`${id}-master`}
					checked={rule.enabled}
					aria-describedby={`${id}-master-summary`}
					onCheckedChange={(enabled) => onChange({ enabled })}
				/>
			</div>

			{rule.enabled ? (
				<>
					{nobody || noDelivery ? (
						<output className="mt-3 block rounded-md bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800 dark:bg-amber-400/10 dark:text-amber-300">
							{nobody
								? "Nobody will be notified until you pick a role or a member."
								: "Turn on the in-app bell or email so people hear about it."}
						</output>
					) : null}

					<Section title="Roles">
						<div className="flex flex-wrap gap-1.5">
							{roles.map((role) => {
								const on = rule.roles.includes(role.value);
								return (
									<button
										key={role.value}
										type="button"
										aria-pressed={on}
										className={cn(
											"inline-flex h-11 items-center gap-1.5 rounded-full border border-input bg-card pr-3 pl-2.5 text-[13px] transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-8",
											on &&
												"border-secondary bg-secondary font-medium text-secondary-foreground hover:bg-secondary/80",
										)}
										onClick={() =>
											onChange({ roles: toggle(rule.roles, role.value) })
										}
									>
										{on ? (
											<Check aria-hidden className="size-[13px] text-primary" />
										) : (
											<Plus
												aria-hidden
												className="size-[13px] text-muted-foreground"
											/>
										)}
										{role.label}
									</button>
								);
							})}
						</div>
					</Section>

					<Section title="Members">
						{members.length ? (
							<ul className="divide-y overflow-hidden rounded-lg border">
								{members.map((member) => {
									const checkboxId = `${id}-member-${member.userId}`;
									const on = rule.userIds.includes(member.userId);
									return (
										<li key={member.userId}>
											<label
												htmlFor={checkboxId}
												className="flex min-h-12 cursor-pointer items-center gap-2.5 px-3 py-2 text-[13.5px] hover:bg-muted/50 md:min-h-10"
											>
												<ActivityAvatar
													name={member.name}
													userId={member.userId}
													size="sm"
												/>
												<span className="min-w-0 flex-1 truncate">
													{member.name}
													{member.role ? (
														<small className="text-muted-foreground">
															{" "}
															· {member.role}
														</small>
													) : null}
												</span>
												<Checkbox
													id={checkboxId}
													checked={on}
													className="rounded-[4px]"
													onCheckedChange={() =>
														onChange({
															userIds: toggle(rule.userIds, member.userId),
														})
													}
												/>
											</label>
										</li>
									);
								})}
							</ul>
						) : (
							<p className="text-[12.5px] text-muted-foreground">
								No staff members can be picked yet.
							</p>
						)}
					</Section>

					<Section title="Delivery">
						{(
							[
								["inApp", Bell, "In-app bell"],
								["email", Mail, "Email"],
							] as const
						).map(([key, Icon, label]) => (
							<div
								key={key}
								className="flex min-h-12 items-center gap-2.5 border-b py-2.5 md:min-h-0"
							>
								<Icon aria-hidden className="size-4 text-muted-foreground" />
								<Label htmlFor={`${id}-${key}`} className="flex-1 font-normal">
									{label}
								</Label>
								<Switch
									id={`${id}-${key}`}
									checked={rule[key]}
									onCheckedChange={(checked) => onChange({ [key]: checked })}
								/>
							</div>
						))}
					</Section>
				</>
			) : null}
		</div>
	);
}

/**
 * Edit one activity type's notification rule: a dialog on desktop, a bottom
 * drawer below 768px. Changes apply immediately (saved by the caller).
 */
export function ActivityRuleEditor({
	rule,
	options,
	onChange,
	onClose,
}: {
	rule: ActivityRule | null;
	options: ActivityRuleOptions | undefined;
	onChange: (rule: ActivityRule, patch: ActivityRulePatch) => void;
	onClose: () => void;
}) {
	const isMobile = useIsMobile();
	// Keep the last rule rendered while the close animation runs.
	const lastRule = useRef(rule);
	if (rule) lastRule.current = rule;
	const shown = rule ?? lastRule.current;
	const open = !!rule;
	const onOpenChange = (next: boolean) => {
		if (!next) onClose();
	};

	if (!shown) return null;
	const title = (
		<>
			{shown.label}
			<small className="font-normal text-muted-foreground">
				{" "}
				· {ACTIVITY_CATEGORY_LABELS[shown.category] ?? shown.category}
			</small>
		</>
	);
	const description = `Choose who hears about “${shown.label}”. Changes save automatically.`;
	const body = (
		<RuleEditorBody
			rule={shown}
			options={options}
			onChange={(patch) => onChange(shown, patch)}
		/>
	);
	const done = (
		<Button type="button" className="min-h-11 md:min-h-9" onClick={onClose}>
			Done
		</Button>
	);

	if (isMobile) {
		return (
			<Drawer
				open={open}
				onOpenChange={onOpenChange}
				shouldScaleBackground={false}
			>
				<DrawerContent className="max-h-[92dvh]">
					<DrawerHeader className="px-4 pt-3 pb-2 text-left">
						<DrawerTitle className="text-base">{title}</DrawerTitle>
						<DrawerDescription className="sr-only">
							{description}
						</DrawerDescription>
					</DrawerHeader>
					<div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{body}</div>
					<DrawerFooter className="border-t pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
						{done}
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[86dvh] flex-col gap-0 p-0 sm:max-w-[520px] sm:rounded-xl">
				<DialogHeader className="border-b px-5 py-4 pr-12 text-left">
					<DialogTitle className="text-base">{title}</DialogTitle>
					<DialogDescription className="sr-only">
						{description}
					</DialogDescription>
				</DialogHeader>
				<div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{body}</div>
				<DialogFooter className="border-t px-5 py-3">{done}</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
