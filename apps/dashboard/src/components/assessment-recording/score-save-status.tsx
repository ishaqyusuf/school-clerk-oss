"use client";

import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import { CircleAlert, CloudCheck, LoaderCircle } from "lucide-react";
import {
	createContext,
	useContext,
	useState,
	useSyncExternalStore,
	type ReactNode,
} from "react";

type ScoreSaveEntry =
	| { status: "saving" }
	| { status: "failed"; retry: () => void };

type ScoreSaveSummary = { saving: number; failed: number };

/** Page-level record of score cells that are saving or failed, keyed by cell. */
function createScoreSaveStore() {
	const entries = new Map<string, ScoreSaveEntry>();
	const listeners = new Set<() => void>();
	let summary: ScoreSaveSummary = { saving: 0, failed: 0 };

	function recompute() {
		let saving = 0;
		let failed = 0;
		for (const entry of entries.values()) {
			if (entry.status === "saving") saving++;
			else failed++;
		}
		if (saving !== summary.saving || failed !== summary.failed) {
			summary = { saving, failed };
			for (const listener of listeners) listener();
		}
	}

	return {
		report(key: string, entry: ScoreSaveEntry | null) {
			if (entry) entries.set(key, entry);
			else entries.delete(key);
			recompute();
		},
		retryFailed() {
			for (const entry of [...entries.values()]) {
				if (entry.status === "failed") entry.retry();
			}
		},
		subscribe(listener: () => void) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		getSummary: () => summary,
	};
}

type ScoreSaveStore = ReturnType<typeof createScoreSaveStore>;

const ScoreSaveContext = createContext<ScoreSaveStore | null>(null);

export function ScoreSaveStatusProvider({ children }: { children: ReactNode }) {
	const [store] = useState(createScoreSaveStore);
	return (
		<ScoreSaveContext.Provider value={store}>
			{children}
		</ScoreSaveContext.Provider>
	);
}

/** Score cells report through this; outside a provider it is a no-op. */
export function useScoreSaveReporter() {
	return useContext(ScoreSaveContext)?.report ?? null;
}

const emptySummary: ScoreSaveSummary = { saving: 0, failed: 0 };
const noopSubscribe = () => () => {};

export function ScoreSaveStatus({ className }: { className?: string }) {
	const store = useContext(ScoreSaveContext);
	const summary = useSyncExternalStore(
		store?.subscribe ?? noopSubscribe,
		store?.getSummary ?? (() => emptySummary),
		() => emptySummary,
	);

	if (summary.failed) {
		return (
			<span
				role="status"
				className={cn(
					"inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-destructive",
					className,
				)}
			>
				<CircleAlert className="size-3.5" />
				{summary.failed} not saved
				<Button
					type="button"
					variant="link"
					size="sm"
					className="h-auto px-0 text-xs text-destructive"
					onClick={() => store?.retryFailed()}
				>
					Retry
				</Button>
			</span>
		);
	}

	return (
		<span
			role="status"
			className={cn(
				"inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground",
				className,
			)}
		>
			{summary.saving ? (
				<>
					<LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" />
					Saving {summary.saving}…
				</>
			) : (
				<>
					<CloudCheck className="size-3.5" />
					All changes saved
				</>
			)}
		</span>
	);
}
