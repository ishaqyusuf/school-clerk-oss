"use client";

import { useTRPC, useTRPCClient } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { toast } from "@school-clerk/ui/use-toast";
import type { ActivityTypeName } from "@school-clerk/utils/activity";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

export type ActivityRulesData = RouterOutputs["activity"]["rules"]["list"];
export type ActivityRule =
	ActivityRulesData["categories"][number]["rules"][number];
export type ActivityRuleOptions = RouterOutputs["activity"]["rules"]["options"];
export type ActivityRulePatch = Partial<
	Pick<ActivityRule, "enabled" | "inApp" | "email" | "roles" | "userIds">
>;
export type ActivityRuleSaveState = "idle" | "saving" | "saved" | "error";

/** Quiet period before a burst of toggles on one rule is persisted. */
const SAVE_DELAY_MS = 450;

/**
 * Optimistic, debounced persistence for activity notification rules.
 *
 * Each change is written to the `activity.rules.list` cache at once and saved
 * after a short quiet period. Saves for one type never overlap: a change made
 * while a save is in flight is sent once it settles. A failed save rolls the
 * type back to its last confirmed state and raises a toast.
 */
export function useActivityRuleSaver() {
	const trpc = useTRPC();
	const client = useTRPCClient();
	const queryClient = useQueryClient();
	const queryKey = trpc.activity.rules.list.queryKey();
	const [state, setState] = useState<ActivityRuleSaveState>("idle");

	const confirmed = useRef(new Map<ActivityTypeName, ActivityRule>());
	const timers = useRef(
		new Map<ActivityTypeName, ReturnType<typeof setTimeout>>(),
	);
	const inFlight = useRef(new Set<ActivityTypeName>());
	const queued = useRef(new Set<ActivityTypeName>());
	const failed = useRef(false);

	const readRule = (type: ActivityTypeName) =>
		queryClient
			.getQueryData<ActivityRulesData>(queryKey)
			?.categories.flatMap((category) => category.rules)
			.find((rule) => rule.type === type) ?? null;

	const writeRule = (type: ActivityTypeName, next: ActivityRule) =>
		queryClient.setQueryData<ActivityRulesData>(queryKey, (data) =>
			data
				? {
						...data,
						categories: data.categories.map((category) => ({
							...category,
							rules: category.rules.map((rule) =>
								rule.type === type ? next : rule,
							),
						})),
					}
				: data,
		);

	const settle = () => {
		if (timers.current.size || inFlight.current.size) return;
		setState(failed.current ? "error" : "saved");
	};

	const send = async (type: ActivityTypeName): Promise<void> => {
		timers.current.delete(type);
		if (inFlight.current.has(type)) {
			queued.current.add(type);
			return;
		}
		const rule = readRule(type);
		if (!rule) {
			settle();
			return;
		}
		inFlight.current.add(type);
		try {
			const saved = await client.activity.rules.update.mutate({
				type,
				enabled: rule.enabled,
				inApp: rule.inApp,
				email: rule.email,
				roles: [...rule.roles],
				userIds: [...rule.userIds],
			});
			const next = { ...rule, ...saved };
			confirmed.current.set(type, next);
			// Only adopt the server copy when no newer edit is waiting.
			if (!timers.current.has(type) && !queued.current.has(type)) {
				writeRule(type, next);
			}
		} catch (error) {
			const timer = timers.current.get(type);
			if (timer) clearTimeout(timer);
			timers.current.delete(type);
			queued.current.delete(type);
			const fallback = confirmed.current.get(type);
			if (fallback) writeRule(type, fallback);
			failed.current = true;
			toast({
				variant: "destructive",
				title: `Couldn't save “${rule.label}”`,
				description:
					error instanceof Error && error.message
						? error.message
						: "The change was undone. Try again.",
			});
		} finally {
			inFlight.current.delete(type);
			if (queued.current.delete(type)) void send(type);
			settle();
		}
	};

	const update = (type: ActivityTypeName, patch: ActivityRulePatch) => {
		const current = readRule(type);
		if (!current) return;
		if (!timers.current.has(type) && !inFlight.current.has(type)) {
			confirmed.current.set(type, current);
		}
		void queryClient.cancelQueries({ queryKey });
		writeRule(type, { ...current, ...patch });
		failed.current = false;
		setState("saving");
		const existing = timers.current.get(type);
		if (existing) clearTimeout(existing);
		timers.current.set(
			type,
			setTimeout(() => void send(type), SAVE_DELAY_MS),
		);
	};

	/** Persist every waiting change now (dialog closed, page left). */
	const flush = () => {
		for (const [type, timer] of [...timers.current]) {
			clearTimeout(timer);
			void send(type);
		}
	};

	const flushRef = useRef(flush);
	flushRef.current = flush;
	useEffect(() => () => flushRef.current(), []);

	return { state, update, flush };
}
