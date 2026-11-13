"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "@school-clerk/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@school-clerk/ui/empty";
import { Skeleton } from "@school-clerk/ui/skeleton";
import type { ActivityTypeName } from "@school-clerk/utils/activity";
import { useQuery } from "@tanstack/react-query";
import { BellOff, CircleCheck, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { ActivityRuleCard } from "./activity-rule-card";
import { ActivityRuleEditor } from "./activity-rule-editor";
import {
	type ActivityRuleSaveState,
	useActivityRuleSaver,
} from "./use-activity-rule-saver";

/*
 * Activity notification settings (ADR-0093, Workshop 03 Grouped digest):
 * category cards list every notifiable type with a "who" summary; Turn on /
 * Edit opens the rule editor. Every type is silent until an admin opts in.
 */

function LockedState() {
	return (
		<Empty className="py-16">
			<EmptyHeader>
				<EmptyMedia variant="icon" className="rounded-full">
					<Lock />
				</EmptyMedia>
				<EmptyTitle>Only admins can change notifications</EmptyTitle>
				<EmptyDescription>
					Ask an admin to turn on notifications for the activity you need.
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}

function SaveIndicator({ state }: { state: ActivityRuleSaveState }) {
	return (
		<output
			aria-live="polite"
			className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap pt-0.5 text-[12.5px] text-muted-foreground"
		>
			{state === "saving" ? (
				<>
					<Loader2 aria-hidden className="size-[13px] animate-spin" />
					Saving…
				</>
			) : state === "saved" ? (
				<>
					<CircleCheck aria-hidden className="size-[13px]" />
					Saved
				</>
			) : state === "error" ? (
				<span className="text-destructive">Changes not saved</span>
			) : null}
		</output>
	);
}

function SettingsSkeleton() {
	return (
		<div aria-busy className="grid items-start gap-3.5 md:grid-cols-2">
			<span className="sr-only">Loading notification settings</span>
			{["a", "b", "c", "d"].map((card, index) => (
				<div
					key={card}
					className="overflow-hidden rounded-[10px] border bg-card"
				>
					<div className="flex items-center gap-2.5 border-b px-3.5 py-3">
						<Skeleton className="size-6 rounded-full" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="ml-auto h-3 w-16" />
					</div>
					{Array.from({ length: [3, 4, 2, 3][index] ?? 3 }, (_, row) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: static placeholder
							key={row}
							className="flex items-center gap-3 border-b px-3.5 py-3 last:border-b-0"
						>
							<div className="flex-1 space-y-2">
								<Skeleton className="h-3.5 w-36" />
								<Skeleton className="h-3 w-24" />
							</div>
							<Skeleton className="h-8 w-16" />
						</div>
					))}
				</div>
			))}
		</div>
	);
}

function isForbidden(error: unknown) {
	return (
		!!error &&
		typeof error === "object" &&
		"data" in error &&
		!!error.data &&
		typeof error.data === "object" &&
		"code" in error.data &&
		error.data.code === "FORBIDDEN"
	);
}

function ManageActivityNotifications() {
	const trpc = useTRPC();
	const queryOptions = { refetchOnWindowFocus: false } as const;
	const rulesQuery = useQuery(
		trpc.activity.rules.list.queryOptions(undefined, queryOptions),
	);
	const optionsQuery = useQuery(
		trpc.activity.rules.options.queryOptions(undefined, queryOptions),
	);
	const saver = useActivityRuleSaver();
	const [editing, setEditing] = useState<ActivityTypeName | null>(null);

	const header = (
		<div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
			<div className="min-w-0 max-w-xl">
				<h2 className="text-lg font-medium">Activity notifications</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Every activity is recorded on the Activity page. Each type is silent
					until you choose who should hear about it.
				</p>
			</div>
			<SaveIndicator state={saver.state} />
		</div>
	);

	if (isForbidden(rulesQuery.error) || isForbidden(optionsQuery.error)) {
		return <LockedState />;
	}

	let content: React.ReactNode;
	if (rulesQuery.isError || optionsQuery.isError) {
		content = (
			<div
				role="alert"
				className="flex flex-col items-start gap-3 rounded-[10px] border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm"
			>
				<p>
					Notification settings could not be loaded.{" "}
					{(rulesQuery.error ?? optionsQuery.error)?.message}
				</p>
				<Button
					type="button"
					variant="outline"
					className="min-h-11 md:min-h-9"
					disabled={rulesQuery.isFetching || optionsQuery.isFetching}
					onClick={() => {
						if (rulesQuery.isError) void rulesQuery.refetch();
						if (optionsQuery.isError) void optionsQuery.refetch();
					}}
				>
					{rulesQuery.isFetching || optionsQuery.isFetching
						? "Retrying…"
						: "Try again"}
				</Button>
			</div>
		);
	} else if (rulesQuery.isPending || optionsQuery.isPending) {
		content = <SettingsSkeleton />;
	} else if (!rulesQuery.data.categories.length) {
		content = (
			<Empty className="border py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon" className="rounded-full">
						<BellOff />
					</EmptyMedia>
					<EmptyTitle>No activity can notify yet</EmptyTitle>
					<EmptyDescription>
						Activity types appear here once the modules that record them are
						turned on for your school.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	} else {
		content = (
			<div className="grid items-start gap-3.5 md:grid-cols-2">
				{rulesQuery.data.categories.map((group) => (
					<ActivityRuleCard
						key={group.category}
						category={group.category}
						label={group.label}
						rules={group.rules}
						options={optionsQuery.data}
						onEdit={(rule) => setEditing(rule.type)}
						onTurnOn={(rule) => {
							saver.update(rule.type, { enabled: true });
							setEditing(rule.type);
						}}
					/>
				))}
			</div>
		);
	}

	const editingRule = editing
		? (rulesQuery.data?.categories
				.flatMap((group) => group.rules)
				.find((rule) => rule.type === editing) ?? null)
		: null;

	return (
		<div className="min-w-0 space-y-6 pb-12">
			{header}
			{content}
			<ActivityRuleEditor
				rule={editingRule}
				options={optionsQuery.data}
				onChange={(rule, patch) => saver.update(rule.type, patch)}
				onClose={() => {
					setEditing(null);
					saver.flush();
				}}
			/>
		</div>
	);
}

export function ActivityNotificationSettings({
	canManage,
}: { canManage: boolean }) {
	return canManage ? <ManageActivityNotifications /> : <LockedState />;
}
