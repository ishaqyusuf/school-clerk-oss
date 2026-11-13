"use client";

import {
	ACTIVITY_CATEGORY_STYLES,
	ActivityAvatar,
} from "@/components/activity/activity-visuals";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import type { ActivityCategory } from "@school-clerk/utils/activity";
import {
	Banknote,
	Bell,
	Bot,
	CalendarCheck,
	ClipboardCheck,
	GraduationCap,
	type LucideIcon,
	Mail,
	Settings2,
	Users,
} from "lucide-react";
import {
	summarizeActivityCategory,
	summarizeActivityRule,
} from "./rule-summary";
import type {
	ActivityRule,
	ActivityRuleOptions,
} from "./use-activity-rule-saver";

const CATEGORY_ICONS: Record<ActivityCategory, LucideIcon> = {
	attendance: CalendarCheck,
	students: Users,
	finance: Banknote,
	academics: GraduationCap,
	assessments: ClipboardCheck,
	assistant: Bot,
	system: Settings2,
};

export function ActivityCategoryIcon({
	category,
	className,
}: {
	category: ActivityCategory;
	className?: string;
}) {
	const Icon = CATEGORY_ICONS[category] ?? Settings2;
	return (
		<span
			aria-hidden
			className={cn(
				"grid size-6 shrink-0 place-items-center rounded-full",
				ACTIVITY_CATEGORY_STYLES[category]?.chip,
				className,
			)}
		>
			<Icon className="size-3.5" />
		</span>
	);
}

export function roleLabel(
	options: ActivityRuleOptions | undefined,
	value: string,
) {
	return (
		options?.roles.find((role) => role.value === value)?.label ??
		value.charAt(0).toUpperCase() + value.slice(1)
	);
}

/** "Off", or "Notifying 2 roles · 1 member" with role/member pills and channels. */
export function ActivityRuleWho({
	rule,
	options,
}: {
	rule: ActivityRule;
	options: ActivityRuleOptions | undefined;
}) {
	const summary = summarizeActivityRule(rule);
	if (!summary.on) {
		return <div className="mt-1 text-[12.5px] text-muted-foreground">Off</div>;
	}
	const members = rule.userIds.flatMap((userId) => {
		const member = options?.members.find((entry) => entry.userId === userId);
		return member ? [member] : [];
	});
	return (
		<div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12.5px]">
			<span
				className={cn(
					"mr-0.5 font-medium",
					summary.warn ? "text-amber-600 dark:text-amber-400" : "text-primary",
				)}
			>
				{summary.text}
			</span>
			{rule.roles.map((role) => (
				<span
					key={role}
					className="rounded-full bg-secondary px-[7px] text-[11.5px] leading-[1.7] text-secondary-foreground"
				>
					{roleLabel(options, role)}
				</span>
			))}
			{members.map((member) => (
				<span
					key={member.userId}
					className="inline-flex items-center gap-1 rounded-full bg-muted py-px pr-[7px] pl-px text-xs leading-[1.5]"
				>
					<ActivityAvatar
						name={member.name}
						userId={member.userId}
						size="sm"
						className="size-[18px] text-[8px]"
					/>
					{member.name.split(" ")[0]}
				</span>
			))}
			<span className="ml-0.5 inline-flex gap-1 text-muted-foreground">
				{rule.inApp ? (
					<>
						<Bell aria-hidden className="size-[13px]" />
						<span className="sr-only">In-app bell</span>
					</>
				) : null}
				{rule.email ? (
					<>
						<Mail aria-hidden className="size-[13px]" />
						<span className="sr-only">Email</span>
					</>
				) : null}
			</span>
		</div>
	);
}

export function ActivityRuleCard({
	category,
	label,
	rules,
	options,
	onEdit,
	onTurnOn,
}: {
	category: ActivityCategory;
	label: string;
	rules: ActivityRule[];
	options: ActivityRuleOptions | undefined;
	onEdit: (rule: ActivityRule) => void;
	onTurnOn: (rule: ActivityRule) => void;
}) {
	const headingId = `activity-rules-${category}`;
	return (
		<section
			aria-labelledby={headingId}
			className="overflow-hidden rounded-[10px] border bg-card"
		>
			<header className="flex items-center gap-2.5 border-b px-3.5 py-3">
				<ActivityCategoryIcon category={category} />
				<h3 id={headingId} className="text-sm font-semibold">
					{label}
				</h3>
				<span className="ml-auto text-[12.5px] text-muted-foreground">
					{summarizeActivityCategory(rules)}
				</span>
			</header>
			<ul className="divide-y">
				{rules.map((rule) => (
					<li
						key={rule.type}
						className="flex min-h-[60px] items-center gap-3 px-3.5 py-[11px] md:min-h-0"
					>
						<div className="min-w-0 flex-1">
							<p className="text-[13.5px] font-medium">{rule.label}</p>
							<ActivityRuleWho rule={rule} options={options} />
						</div>
						<Button
							type="button"
							size="sm"
							variant={rule.enabled ? "ghost" : "outline"}
							className="min-h-11 shrink-0 md:min-h-8"
							aria-label={`${rule.enabled ? "Edit" : "Turn on"} notifications for ${rule.label}`}
							onClick={() => (rule.enabled ? onEdit(rule) : onTurnOn(rule))}
						>
							{rule.enabled ? "Edit" : "Turn on"}
						</Button>
					</li>
				))}
			</ul>
		</section>
	);
}
