"use client";

import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import { CircleAlert, CloudCheck, CloudOff, LoaderCircle } from "lucide-react";
import { type ReactNode, useSyncExternalStore } from "react";
import { _qc, _trpc, _trpcClient } from "../static-trpc";
import {
	type ScoreSaveEntryState,
	ScoreSaveNotReadyError,
	type ScoreSaveQueue,
	type ScoreSaveRequest,
	type ScoreSaveResult,
	type ScoreSaveSummary,
	createScoreSaveQueue,
} from "./score-save-queue";

// ---- browser outbox wiring ------------------------------------------------

async function sendScore(request: ScoreSaveRequest): Promise<ScoreSaveResult> {
	const client = _trpcClient;
	if (!client) throw new ScoreSaveNotReadyError();
	const result: unknown =
		request.kind === "public"
			? await client.assessments.updatePublicAssessmentScore.mutate(
					request.payload,
				)
			: await client.assessments.updateAssessmentScore.mutate(request.payload);
	return (result ?? {}) as ScoreSaveResult;
}

// Bursts of saves (e.g. a resumed outbox) share one invalidation per query.
const pendingInvalidations = {
	authenticated: false,
	tokens: new Set<string>(),
};
let invalidationTimer: ReturnType<typeof setTimeout> | undefined;

function flushInvalidations() {
	invalidationTimer = undefined;
	const qc = _qc;
	const trpc = _trpc;
	if (!qc || !trpc) return;
	if (pendingInvalidations.authenticated) {
		qc.invalidateQueries({
			queryKey: trpc.assessments.getClassroomReportSheet.queryKey({}),
		});
		qc.invalidateQueries({
			queryKey: trpc.assessments.getSubjectAssessmentRecordings.queryKey({}),
		});
	}
	for (const token of pendingInvalidations.tokens) {
		qc.invalidateQueries({
			queryKey: trpc.assessments.getPublicAssessmentLink.queryKey({ token }),
		});
	}
	pendingInvalidations.authenticated = false;
	pendingInvalidations.tokens.clear();
}

function invalidateAfterSave(request: ScoreSaveRequest) {
	if (request.kind === "public") {
		pendingInvalidations.tokens.add(request.payload.token);
	} else {
		pendingInvalidations.authenticated = true;
	}
	invalidationTimer ??= setTimeout(flushInvalidations, 250);
}

const GLOBAL_KEY = "__schoolClerkScoreSaveQueue";
type QueueGlobal = typeof globalThis & { [GLOBAL_KEY]?: ScoreSaveQueue };

/**
 * The page-wide score outbox. Created on first use in the browser (which also
 * resumes saves persisted by an earlier visit); `null` during SSR.
 */
export function getScoreSaveQueue(): ScoreSaveQueue | null {
	if (typeof window === "undefined") return null;
	const scope = globalThis as QueueGlobal;
	let queue = scope[GLOBAL_KEY];
	if (!queue) {
		let storage: Storage | null = null;
		try {
			storage = window.localStorage;
		} catch {
			storage = null;
		}
		queue = createScoreSaveQueue({
			send: sendScore,
			onSaved: invalidateAfterSave,
			storage,
			isOnline: () => navigator.onLine !== false,
			windowTarget: window,
			documentTarget: document,
		});
		scope[GLOBAL_KEY] = queue;
		queue.resume();
	}
	return queue;
}

function peekQueue() {
	if (typeof window === "undefined") return undefined;
	return (globalThis as QueueGlobal)[GLOBAL_KEY];
}

const emptySummary: ScoreSaveSummary = {
	saving: 0,
	retrying: 0,
	failed: 0,
	offline: false,
};

// Subscribing (an effect) creates the queue, so render never triggers sends.
function subscribeQueue(listener: () => void) {
	return getScoreSaveQueue()?.subscribe(listener) ?? (() => {});
}

export function useScoreSaveSummary(): ScoreSaveSummary {
	return useSyncExternalStore(
		subscribeQueue,
		() => peekQueue()?.getSummary() ?? emptySummary,
		() => emptySummary,
	);
}

export function useScoreSaveEntry(
	key: string,
): ScoreSaveEntryState | undefined {
	return useSyncExternalStore(
		subscribeQueue,
		() => peekQueue()?.getEntryState(key),
		() => undefined,
	);
}

// ---- status UI ------------------------------------------------------------

/** Kept for API stability; the outbox is page-wide so no context is needed. */
export function ScoreSaveStatusProvider({ children }: { children: ReactNode }) {
	return <>{children}</>;
}

/** Full label for wide screens and screen readers, short label on phones. */
function StatusLabel({ full, short }: { full: string; short: string }) {
	return (
		<>
			<span className="max-sm:sr-only">{full}</span>
			<span aria-hidden="true" className="sm:hidden">
				{short}
			</span>
		</>
	);
}

const iconClassName = "size-3.5 shrink-0";
const spinnerClassName = cn(
	iconClassName,
	"animate-spin motion-reduce:animate-none",
);

export function ScoreSaveStatus({ className }: { className?: string }) {
	const summary = useScoreSaveSummary();
	const retry = () => getScoreSaveQueue()?.retryNow();
	const baseClassName =
		"inline-flex items-center gap-1.5 whitespace-nowrap text-xs";

	if (summary.failed) {
		return (
			<output
				aria-live="polite"
				className={cn(baseClassName, "font-medium text-destructive", className)}
			>
				<CircleAlert className={iconClassName} aria-hidden="true" />
				<StatusLabel
					full={`${summary.failed} not saved`}
					short={`${summary.failed} not saved`}
				/>
				<Button
					type="button"
					variant="link"
					size="sm"
					className="h-auto px-0 text-xs text-destructive"
					onClick={retry}
				>
					Retry
				</Button>
			</output>
		);
	}

	if (summary.retrying) {
		const waiting = summary.retrying + summary.saving;
		return (
			<output
				aria-live="polite"
				className={cn(
					baseClassName,
					"font-medium text-amber-700 dark:text-amber-400",
					className,
				)}
			>
				{summary.offline ? (
					<>
						<CloudOff className={iconClassName} aria-hidden="true" />
						<StatusLabel
							full={`Offline · ${waiting} waiting`}
							short={`Offline · ${waiting}`}
						/>
					</>
				) : (
					<>
						<LoaderCircle className={spinnerClassName} aria-hidden="true" />
						<StatusLabel
							full={`Retrying ${summary.retrying}…`}
							short={`Retrying ${summary.retrying}`}
						/>
					</>
				)}
				<Button
					type="button"
					variant="link"
					size="sm"
					className="h-auto px-0 text-xs text-amber-700 dark:text-amber-400"
					onClick={retry}
				>
					<StatusLabel full="Retry now" short="Retry" />
				</Button>
			</output>
		);
	}

	return (
		<output
			aria-live="polite"
			className={cn(baseClassName, "text-muted-foreground", className)}
		>
			{summary.saving ? (
				<>
					<LoaderCircle className={spinnerClassName} aria-hidden="true" />
					<StatusLabel
						full={`Saving ${summary.saving}…`}
						short={`Saving ${summary.saving}…`}
					/>
				</>
			) : (
				<>
					<CloudCheck className={iconClassName} aria-hidden="true" />
					<StatusLabel full="All changes saved" short="Saved" />
				</>
			)}
		</output>
	);
}
