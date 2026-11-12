/**
 * Persistent outbox for assessment score saves.
 *
 * Every typed score is coalesced per cell, debounced, and retried until the
 * server accepts it. Pending values survive blur, unmount and reloads (via
 * storage). Framework-free: all side effects are injected so it can be tested
 * without a browser.
 */

export type AuthenticatedScorePayload = {
	id?: number | null;
	obtained: number | null;
	assessmentId: number;
	studentTermId: string;
	studentId: string;
	departmentId: string;
};

export type PublicScorePayload = {
	id?: number | null;
	obtained: number | null;
	assessmentId: number;
	studentTermId: string;
	studentId: string;
	departmentSubjectId: string;
	token: string;
};

export type ScoreSaveRequest =
	| { kind: "authenticated"; payload: AuthenticatedScorePayload }
	| { kind: "public"; payload: PublicScorePayload };

export type ScoreSaveResult = {
	id?: number | null;
	obtained?: number | null;
	[key: string]: unknown;
};

export type ScoreSaveStatusName = "pending" | "saving" | "retrying" | "failed";

export type ScoreSaveEntryState = {
	status: ScoreSaveStatusName;
	value: number | null;
	attempt: number;
	nextRetryAt?: number;
	error?: string;
};

export type ScoreSaveSummary = {
	/** Entries waiting for their debounce or currently in flight. */
	saving: number;
	/** Entries that hit a retryable error and will be resent automatically. */
	retrying: number;
	/** Entries rejected by the server; they need a manual retry. */
	failed: number;
	offline: boolean;
};

type Listener = () => void;
type SavedListener = (result: ScoreSaveResult) => void;

type EventTargetLike = {
	addEventListener(type: string, listener: (event: Event) => void): void;
	removeEventListener(type: string, listener: (event: Event) => void): void;
};

export type ScoreSaveStorage = {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
};

type TimerHandle = unknown;

export type ScoreSaveQueueDeps = {
	send: (request: ScoreSaveRequest) => Promise<ScoreSaveResult>;
	/** Runs after a key is fully saved (no newer value queued), e.g. query invalidation. */
	onSaved?: (request: ScoreSaveRequest, result: ScoreSaveResult) => void;
	storage?: ScoreSaveStorage | null;
	now?: () => number;
	random?: () => number;
	setTimer?: (callback: () => void, ms: number) => TimerHandle;
	clearTimer?: (handle: TimerHandle) => void;
	isOnline?: () => boolean;
	/** Receives `online`, `offline` and `beforeunload`. */
	windowTarget?: EventTargetLike | null;
	/** Receives `visibilitychange`. */
	documentTarget?:
		| (EventTargetLike & { visibilityState?: DocumentVisibilityState })
		| null;
	debounceMs?: number;
	baseRetryMs?: number;
	maxRetryMs?: number;
	maxAgeMs?: number;
	storageKey?: string;
};

export const SCORE_OUTBOX_STORAGE_KEY =
	"school-clerk:assessment-score-outbox:v1";
export const SCORE_SAVE_DEBOUNCE_MS = 600;
export const SCORE_RETRY_BASE_MS = 1_000;
export const SCORE_RETRY_MAX_MS = 30_000;
export const SCORE_OUTBOX_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;

/** Thrown by a sender that has no transport yet; always retried. */
export class ScoreSaveNotReadyError extends Error {
	constructor() {
		super("Score saving is not ready yet.");
		this.name = "ScoreSaveNotReadyError";
	}
}

const RETRYABLE_TRPC_CODES = new Set([
	"INTERNAL_SERVER_ERROR",
	"TIMEOUT",
	"TOO_MANY_REQUESTS",
	"CLIENT_CLOSED_REQUEST",
	"CONFLICT",
	"BAD_GATEWAY",
	"SERVICE_UNAVAILABLE",
	"GATEWAY_TIMEOUT",
]);

function isRetryableHttpStatus(status: unknown) {
	return (
		typeof status === "number" &&
		(status === 408 || status === 429 || status >= 500)
	);
}

/**
 * Network failures, timeouts, 5xx/408/429 and transient tRPC codes are retried
 * forever. Errors carrying a tRPC error shape with any other code (BAD_REQUEST,
 * FORBIDDEN, UNAUTHORIZED, NOT_FOUND, PARSE_ERROR…) are terminal.
 */
export function isRetryableScoreSaveError(error: unknown): boolean {
	if (error instanceof ScoreSaveNotReadyError) return true;
	if (!error || typeof error !== "object") return true;
	const err = error as {
		name?: unknown;
		data?: { code?: unknown; httpStatus?: unknown } | null;
		shape?: { data?: { code?: unknown; httpStatus?: unknown } } | null;
		meta?: { response?: { status?: unknown } } | null;
	};
	if (err instanceof TypeError) return true;
	if (err.name === "AbortError" || err.name === "TimeoutError") return true;

	const data = err.data ?? err.shape?.data ?? null;
	if (data) {
		if (typeof data.code === "string" && RETRYABLE_TRPC_CODES.has(data.code)) {
			return true;
		}
		return isRetryableHttpStatus(data.httpStatus);
	}
	const responseStatus = err.meta?.response?.status;
	if (typeof responseStatus === "number") {
		return isRetryableHttpStatus(responseStatus);
	}
	// No server error shape: the request never got a structured answer
	// (offline, DNS, proxy HTML error page…). Treat as network failure.
	return true;
}

function errorMessage(error: unknown) {
	if (error instanceof Error && error.message) return error.message;
	if (typeof error === "string") return error;
	return "Could not save score.";
}

type Entry = {
	key: string;
	latest: ScoreSaveRequest;
	queuedAt: number;
	status: ScoreSaveStatusName;
	attempt: number;
	nextRetryAt?: number;
	error?: string;
	/** `latest` has not been sent (or must be resent). */
	dirty: boolean;
	/** The request currently in flight. */
	sent?: ScoreSaveRequest;
	inFlight: boolean;
	/** Escape pressed while a request was in flight: drop instead of retrying. */
	cancelled: boolean;
	debounceTimer?: TimerHandle;
	retryTimer?: TimerHandle;
};

type PersistedEntry = {
	key: string;
	kind: ScoreSaveRequest["kind"];
	payload: ScoreSaveRequest["payload"];
	queuedAt: number;
};

const emptySummary: ScoreSaveSummary = {
	saving: 0,
	retrying: 0,
	failed: 0,
	offline: false,
};

export type ScoreSaveQueue = ReturnType<typeof createScoreSaveQueue>;

export function createScoreSaveQueue(deps: ScoreSaveQueueDeps) {
	const now = deps.now ?? Date.now;
	const random = deps.random ?? Math.random;
	const setTimer =
		deps.setTimer ??
		((callback: () => void, ms: number) => setTimeout(callback, ms));
	const clearTimer =
		deps.clearTimer ??
		((handle: TimerHandle) =>
			clearTimeout(handle as ReturnType<typeof setTimeout>));
	const isOnline = deps.isOnline ?? (() => true);
	const debounceMs = deps.debounceMs ?? SCORE_SAVE_DEBOUNCE_MS;
	const baseRetryMs = deps.baseRetryMs ?? SCORE_RETRY_BASE_MS;
	const maxRetryMs = deps.maxRetryMs ?? SCORE_RETRY_MAX_MS;
	const maxAgeMs = deps.maxAgeMs ?? SCORE_OUTBOX_MAX_AGE_MS;
	const storageKey = deps.storageKey ?? SCORE_OUTBOX_STORAGE_KEY;
	const storage = deps.storage ?? null;

	const entries = new Map<string, Entry>();
	const listeners = new Set<Listener>();
	const savedListeners = new Map<string, Set<SavedListener>>();
	let states = new Map<string, ScoreSaveEntryState>();
	let summary: ScoreSaveSummary = { ...emptySummary, offline: !isOnline() };
	let resumed = false;
	let disposed = false;

	// ---- persistence -------------------------------------------------------

	function readPersisted(): PersistedEntry[] {
		if (!storage) return [];
		try {
			const raw = storage.getItem(storageKey);
			if (!raw) return [];
			const parsed = JSON.parse(raw) as { entries?: unknown };
			if (!parsed || !Array.isArray(parsed.entries)) return [];
			return parsed.entries.filter(
				(entry): entry is PersistedEntry =>
					!!entry &&
					typeof entry === "object" &&
					typeof (entry as PersistedEntry).key === "string" &&
					((entry as PersistedEntry).kind === "authenticated" ||
						(entry as PersistedEntry).kind === "public") &&
					!!(entry as PersistedEntry).payload &&
					typeof (entry as PersistedEntry).queuedAt === "number",
			);
		} catch {
			return [];
		}
	}

	function persist() {
		if (!storage) return;
		try {
			const list: PersistedEntry[] = [];
			for (const entry of entries.values()) {
				list.push({
					key: entry.key,
					kind: entry.latest.kind,
					payload: entry.latest.payload,
					queuedAt: entry.queuedAt,
				});
			}
			if (list.length === 0) storage.removeItem(storageKey);
			else storage.setItem(storageKey, JSON.stringify({ entries: list }));
		} catch {
			// Storage full or blocked: the in-memory queue still retries.
		}
	}

	// ---- observable state --------------------------------------------------

	function publish() {
		const nextStates = new Map<string, ScoreSaveEntryState>();
		let saving = 0;
		let retrying = 0;
		let failed = 0;
		for (const entry of entries.values()) {
			const value = entry.latest.payload.obtained ?? null;
			const previous = states.get(entry.key);
			const next: ScoreSaveEntryState =
				previous &&
				previous.status === entry.status &&
				previous.value === value &&
				previous.attempt === entry.attempt &&
				previous.nextRetryAt === entry.nextRetryAt &&
				previous.error === entry.error
					? previous
					: {
							status: entry.status,
							value,
							attempt: entry.attempt,
							...(entry.nextRetryAt != null
								? { nextRetryAt: entry.nextRetryAt }
								: {}),
							...(entry.error != null ? { error: entry.error } : {}),
						};
			nextStates.set(entry.key, next);
			if (entry.status === "failed") failed++;
			else if (entry.status === "retrying") retrying++;
			else saving++;
		}
		states = nextStates;
		const offline = !isOnline();
		if (
			summary.saving !== saving ||
			summary.retrying !== retrying ||
			summary.failed !== failed ||
			summary.offline !== offline
		) {
			summary = { saving, retrying, failed, offline };
		}
		for (const listener of [...listeners]) listener();
	}

	function emitSaved(key: string, result: ScoreSaveResult) {
		const set = savedListeners.get(key);
		if (!set) return;
		for (const listener of [...set]) {
			try {
				listener(result);
			} catch {
				// A broken subscriber must not stall the queue.
			}
		}
	}

	// ---- scheduling --------------------------------------------------------

	function clearTimers(entry: Entry) {
		if (entry.debounceTimer !== undefined) {
			clearTimer(entry.debounceTimer);
			entry.debounceTimer = undefined;
		}
		if (entry.retryTimer !== undefined) {
			clearTimer(entry.retryTimer);
			entry.retryTimer = undefined;
		}
	}

	function retryDelay(attempt: number) {
		const exponential = Math.min(
			maxRetryMs,
			baseRetryMs * 2 ** Math.max(0, attempt - 1),
		);
		// ±20% jitter so many cells don't retry in lockstep.
		const jittered = exponential * (0.8 + random() * 0.4);
		return Math.round(Math.min(maxRetryMs, jittered));
	}

	function scheduleRetry(entry: Entry, delay: number) {
		if (entry.retryTimer !== undefined) clearTimer(entry.retryTimer);
		entry.nextRetryAt = now() + delay;
		entry.retryTimer = setTimer(() => {
			entry.retryTimer = undefined;
			entry.nextRetryAt = undefined;
			dispatch(entry, { force: true });
		}, delay);
	}

	function dispatch(entry: Entry, options: { force?: boolean } = {}) {
		if (disposed || entries.get(entry.key) !== entry) return;
		if (entry.inFlight || !entry.dirty) return;
		if (entry.debounceTimer !== undefined) return;

		if (!options.force && !isOnline()) {
			// Wait for `online`; a slow fallback covers a stuck navigator.onLine.
			entry.status = "retrying";
			entry.error = "You are offline.";
			scheduleRetry(entry, maxRetryMs);
			publish();
			return;
		}

		if (entry.retryTimer !== undefined) {
			clearTimer(entry.retryTimer);
			entry.retryTimer = undefined;
		}
		entry.nextRetryAt = undefined;

		const request = entry.latest;
		entry.sent = request;
		entry.inFlight = true;
		entry.dirty = false;
		if (entry.status !== "retrying") entry.status = "saving";
		publish();

		let promise: Promise<ScoreSaveResult>;
		try {
			promise = deps.send(request);
		} catch (error) {
			promise = Promise.reject(error);
		}
		promise.then(
			(result) => handleSuccess(entry, request, result),
			(error) => handleFailure(entry, error),
		);
	}

	function handleSuccess(
		entry: Entry,
		request: ScoreSaveRequest,
		result: ScoreSaveResult,
	) {
		entry.inFlight = false;
		entry.sent = undefined;
		if (disposed || entries.get(entry.key) !== entry) return;

		if (entry.dirty && !entry.cancelled) {
			// A newer value arrived while this one was in flight; send it next.
			entry.attempt = 0;
			entry.error = undefined;
			entry.status = "pending";
			publish();
			dispatch(entry);
			return;
		}

		clearTimers(entry);
		entries.delete(entry.key);
		persist();
		publish();
		emitSaved(entry.key, result ?? {});
		try {
			deps.onSaved?.(request, result ?? {});
		} catch {
			// Invalidation problems must not break the queue.
		}
	}

	function handleFailure(entry: Entry, error: unknown) {
		entry.inFlight = false;
		entry.sent = undefined;
		if (disposed || entries.get(entry.key) !== entry) return;

		if (entry.cancelled) {
			clearTimers(entry);
			entries.delete(entry.key);
			persist();
			publish();
			return;
		}

		entry.dirty = true;
		entry.error = errorMessage(error);
		if (isRetryableScoreSaveError(error)) {
			entry.attempt += 1;
			entry.status = "retrying";
			if (entry.debounceTimer !== undefined) {
				clearTimer(entry.debounceTimer);
				entry.debounceTimer = undefined;
			}
			scheduleRetry(entry, retryDelay(entry.attempt));
		} else {
			entry.status = "failed";
			clearTimers(entry);
			entry.nextRetryAt = undefined;
		}
		publish();
	}

	function startDebounce(entry: Entry) {
		if (entry.debounceTimer !== undefined) clearTimer(entry.debounceTimer);
		entry.debounceTimer = setTimer(() => {
			entry.debounceTimer = undefined;
			dispatch(entry);
		}, debounceMs);
	}

	/** Re-send everything that is waiting on a backoff timer or offline. */
	function retryWaiting() {
		for (const entry of entries.values()) {
			if (entry.status === "failed" || entry.inFlight || !entry.dirty) continue;
			if (entry.debounceTimer !== undefined) continue;
			if (entry.retryTimer !== undefined) {
				clearTimer(entry.retryTimer);
				entry.retryTimer = undefined;
			}
			entry.nextRetryAt = undefined;
			dispatch(entry);
		}
	}

	// ---- browser events ----------------------------------------------------

	const onOnline = () => {
		publish();
		retryWaiting();
	};
	const onOffline = () => publish();
	const onVisibility = () => {
		if (deps.documentTarget?.visibilityState === "visible") retryWaiting();
	};
	const onBeforeUnload = (event: Event) => {
		if (!hasUnsavedWork()) return;
		event.preventDefault();
		// Legacy browsers only show the prompt when returnValue is set.
		(event as unknown as { returnValue: unknown }).returnValue = "";
	};

	deps.windowTarget?.addEventListener("online", onOnline);
	deps.windowTarget?.addEventListener("offline", onOffline);
	deps.windowTarget?.addEventListener("beforeunload", onBeforeUnload);
	deps.documentTarget?.addEventListener("visibilitychange", onVisibility);

	function hasUnsavedWork() {
		for (const entry of entries.values()) {
			if (entry.status !== "failed") return true;
		}
		return false;
	}

	// ---- public API --------------------------------------------------------

	return {
		/** Queue the latest value for a cell; replaces any unsent older value. */
		enqueue(key: string, request: ScoreSaveRequest) {
			let entry = entries.get(key);
			if (!entry) {
				entry = {
					key,
					latest: request,
					queuedAt: now(),
					status: "pending",
					attempt: 0,
					dirty: true,
					inFlight: false,
					cancelled: false,
				};
				entries.set(key, entry);
			}
			entry.latest = request;
			entry.queuedAt = now();
			entry.dirty = true;
			entry.cancelled = false;
			entry.attempt = 0;
			entry.error = undefined;
			entry.nextRetryAt = undefined;
			if (entry.retryTimer !== undefined) {
				clearTimer(entry.retryTimer);
				entry.retryTimer = undefined;
			}
			if (!entry.inFlight) entry.status = "pending";
			startDebounce(entry);
			persist();
			publish();
		},

		/** Skip the debounce for a key (e.g. on blur). */
		flush(key: string) {
			const entry = entries.get(key);
			if (!entry || entry.debounceTimer === undefined) return;
			clearTimer(entry.debounceTimer);
			entry.debounceTimer = undefined;
			dispatch(entry);
		},

		/**
		 * Drop the unsent value for a key. A request already in flight cannot be
		 * recalled: it is allowed to finish but is never retried.
		 */
		cancel(key: string) {
			const entry = entries.get(key);
			if (!entry) return;
			if (entry.inFlight) {
				if (entry.debounceTimer !== undefined) {
					clearTimer(entry.debounceTimer);
					entry.debounceTimer = undefined;
				}
				entry.dirty = false;
				entry.cancelled = true;
				if (entry.sent) entry.latest = entry.sent;
				persist();
				publish();
				return;
			}
			clearTimers(entry);
			entries.delete(key);
			persist();
			publish();
		},

		/** Manual retry: failed entries are resent and backoff waits are skipped. */
		retryNow(key?: string) {
			for (const entry of entries.values()) {
				if (key != null && entry.key !== key) continue;
				if (entry.inFlight || !entry.dirty) continue;
				if (entry.status === "failed") {
					entry.status = "pending";
					entry.attempt = 0;
					entry.error = undefined;
				}
				if (entry.debounceTimer !== undefined) {
					clearTimer(entry.debounceTimer);
					entry.debounceTimer = undefined;
				}
				if (entry.retryTimer !== undefined) {
					clearTimer(entry.retryTimer);
					entry.retryTimer = undefined;
				}
				entry.nextRetryAt = undefined;
				dispatch(entry, { force: true });
			}
			publish();
		},

		/** Load persisted entries (once). Entries older than maxAgeMs are dropped. */
		resume() {
			if (resumed) return;
			resumed = true;
			const persisted = readPersisted();
			const cutoff = now() - maxAgeMs;
			let changed = false;
			for (const item of persisted) {
				if (item.queuedAt < cutoff) {
					changed = true;
					continue;
				}
				if (entries.has(item.key)) continue;
				const entry: Entry = {
					key: item.key,
					latest: {
						kind: item.kind,
						payload: item.payload,
					} as ScoreSaveRequest,
					queuedAt: item.queuedAt,
					status: "pending",
					attempt: 0,
					dirty: true,
					inFlight: false,
					cancelled: false,
				};
				entries.set(item.key, entry);
				changed = true;
			}
			if (!changed) return;
			persist();
			publish();
			for (const entry of [...entries.values()]) {
				if (entry.status === "pending" && !entry.inFlight) dispatch(entry);
			}
		},

		getEntryState(key: string): ScoreSaveEntryState | undefined {
			return states.get(key);
		},
		getSnapshot(): ReadonlyMap<string, ScoreSaveEntryState> {
			return states;
		},
		getSummary(): ScoreSaveSummary {
			return summary;
		},
		hasUnsavedWork,
		subscribe(listener: Listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		/** Fires with the server result once a key is saved with nothing newer queued. */
		onSaved(key: string, listener: SavedListener) {
			let set = savedListeners.get(key);
			if (!set) {
				set = new Set();
				savedListeners.set(key, set);
			}
			set.add(listener);
			return () => {
				set.delete(listener);
				if (set.size === 0) savedListeners.delete(key);
			};
		},
		dispose() {
			disposed = true;
			for (const entry of entries.values()) clearTimers(entry);
			deps.windowTarget?.removeEventListener("online", onOnline);
			deps.windowTarget?.removeEventListener("offline", onOffline);
			deps.windowTarget?.removeEventListener("beforeunload", onBeforeUnload);
			deps.documentTarget?.removeEventListener(
				"visibilitychange",
				onVisibility,
			);
			listeners.clear();
			savedListeners.clear();
		},
	};
}
