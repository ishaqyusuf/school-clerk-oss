import { describe, expect, test } from "bun:test";
import {
	SCORE_OUTBOX_MAX_AGE_MS,
	SCORE_OUTBOX_STORAGE_KEY,
	type ScoreSaveQueueDeps,
	type ScoreSaveRequest,
	type ScoreSaveResult,
	createScoreSaveQueue,
	isRetryableScoreSaveError,
} from "./score-save-queue";

/** Deterministic timers: `advance` runs due callbacks in order and settles promises. */
function createFakeClock(start = 1_000_000) {
	let current = start;
	let nextId = 1;
	const timers = new Map<number, { at: number; callback: () => void }>();
	return {
		now: () => current,
		setTimer(callback: () => void, ms: number) {
			const id = nextId++;
			timers.set(id, { at: current + ms, callback });
			return id;
		},
		clearTimer(handle: unknown) {
			timers.delete(handle as number);
		},
		pendingTimers: () => timers.size,
		async advance(ms: number) {
			const target = current + ms;
			await flushPromises();
			for (;;) {
				let dueId: number | null = null;
				let dueAt = Number.POSITIVE_INFINITY;
				for (const [id, timer] of timers) {
					if (timer.at <= target && timer.at < dueAt) {
						dueAt = timer.at;
						dueId = id;
					}
				}
				if (dueId == null) break;
				const timer = timers.get(dueId);
				timers.delete(dueId);
				current = dueAt;
				timer?.callback();
				await flushPromises();
			}
			current = target;
			await flushPromises();
		},
	};
}

async function flushPromises() {
	for (let i = 0; i < 10; i++) await Promise.resolve();
}

function createMemoryStorage(initial: Record<string, string> = {}) {
	const data = new Map(Object.entries(initial));
	return {
		data,
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => {
			data.set(key, value);
		},
		removeItem: (key: string) => {
			data.delete(key);
		},
	};
}

type Deferred = {
	request: ScoreSaveRequest;
	resolve: (result: ScoreSaveResult) => void;
	reject: (error: unknown) => void;
};

/** A sender whose requests settle only when the test says so. */
function createManualSender() {
	const calls: Deferred[] = [];
	const send = (request: ScoreSaveRequest) =>
		new Promise<ScoreSaveResult>((resolve, reject) => {
			calls.push({ request, resolve, reject });
		});
	return { calls, send };
}

function request(obtained: number | null): ScoreSaveRequest {
	return {
		kind: "authenticated",
		payload: {
			obtained,
			assessmentId: 7,
			studentTermId: "stf-1",
			studentId: "student-1",
			departmentId: "dept-1",
		},
	};
}

function trpcError(code: string, httpStatus: number) {
	return Object.assign(new Error(code), {
		name: "TRPCClientError",
		data: { code, httpStatus },
	});
}

function networkError() {
	// TRPCClientError for a failed fetch carries no `data`.
	return Object.assign(new Error("Failed to fetch"), {
		name: "TRPCClientError",
		data: undefined,
		cause: new TypeError("Failed to fetch"),
	});
}

function setup(overrides: Partial<ScoreSaveQueueDeps> = {}) {
	const clock = createFakeClock();
	const sender = createManualSender();
	const saved: Array<{ request: ScoreSaveRequest; result: ScoreSaveResult }> =
		[];
	const queue = createScoreSaveQueue({
		send: sender.send,
		onSaved: (req, result) => saved.push({ request: req, result }),
		now: clock.now,
		setTimer: clock.setTimer,
		clearTimer: clock.clearTimer,
		random: () => 0.5, // no jitter
		...overrides,
	});
	return { clock, sender, saved, queue };
}

const KEY = "stf-1:7";

describe("score save queue", () => {
	test("debounces and coalesces to the latest value per key", async () => {
		const { clock, sender, queue } = setup();
		queue.enqueue(KEY, request(1));
		await clock.advance(300);
		queue.enqueue(KEY, request(12));
		await clock.advance(300);
		queue.enqueue(KEY, request(15));
		expect(queue.getEntryState(KEY)?.status).toBe("pending");
		expect(queue.getSummary().saving).toBe(1);

		await clock.advance(599);
		expect(sender.calls).toHaveLength(0);
		await clock.advance(1);
		expect(sender.calls).toHaveLength(1);
		expect(sender.calls[0]?.request.payload.obtained).toBe(15);
		expect(queue.getEntryState(KEY)?.status).toBe("saving");
	});

	test("keeps keys independent", async () => {
		const { clock, sender, queue } = setup();
		queue.enqueue("a", request(1));
		queue.enqueue("b", request(2));
		await clock.advance(600);
		expect(sender.calls.map((call) => call.request.payload.obtained)).toEqual([
			1, 2,
		]);
	});

	test("flush skips the debounce", async () => {
		const { sender, queue } = setup();
		queue.enqueue(KEY, request(4));
		queue.flush(KEY);
		expect(sender.calls).toHaveLength(1);
	});

	test("sends a newer value only after the in-flight one settles, never out of order", async () => {
		const { clock, sender, saved, queue } = setup();
		const savedEvents: ScoreSaveResult[] = [];
		queue.onSaved(KEY, (result) => savedEvents.push(result));

		queue.enqueue(KEY, request(5));
		await clock.advance(600);
		expect(sender.calls).toHaveLength(1);

		queue.enqueue(KEY, request(9));
		await clock.advance(600);
		// Still one request: at most one in flight per key.
		expect(sender.calls).toHaveLength(1);

		sender.calls[0]?.resolve({ obtained: 5, id: 1 });
		await clock.advance(0);
		// The older response must not be reported as the cell's saved value.
		expect(savedEvents).toHaveLength(0);
		expect(saved).toHaveLength(0);
		expect(queue.getEntryState(KEY)?.value).toBe(9);
		expect(sender.calls).toHaveLength(2);
		expect(sender.calls[1]?.request.payload.obtained).toBe(9);

		sender.calls[1]?.resolve({ obtained: 9, id: 1 });
		await clock.advance(0);
		expect(savedEvents).toEqual([{ obtained: 9, id: 1 }]);
		expect(saved).toHaveLength(1);
		expect(queue.getEntryState(KEY)).toBeUndefined();
		expect(queue.getSummary()).toEqual({
			saving: 0,
			retrying: 0,
			failed: 0,
			offline: false,
		});
	});

	test("retries network errors with exponential backoff until saved", async () => {
		const { clock, sender, queue } = setup();
		queue.enqueue(KEY, request(8));
		await clock.advance(600);

		sender.calls[0]?.reject(networkError());
		await clock.advance(0);
		let state = queue.getEntryState(KEY);
		expect(state?.status).toBe("retrying");
		expect(state?.attempt).toBe(1);
		expect(state?.nextRetryAt).toBe(clock.now() + 1_000);
		expect(queue.getSummary().retrying).toBe(1);

		await clock.advance(999);
		expect(sender.calls).toHaveLength(1);
		await clock.advance(1);
		expect(sender.calls).toHaveLength(2);

		sender.calls[1]?.reject(trpcError("INTERNAL_SERVER_ERROR", 500));
		await clock.advance(0);
		state = queue.getEntryState(KEY);
		expect(state?.attempt).toBe(2);
		await clock.advance(1_999);
		expect(sender.calls).toHaveLength(2);
		await clock.advance(1);
		expect(sender.calls).toHaveLength(3);

		sender.calls[2]?.reject(new TypeError("Failed to fetch"));
		await clock.advance(4_000);
		expect(sender.calls).toHaveLength(4);
		expect(sender.calls[3]?.request.payload.obtained).toBe(8);

		sender.calls[3]?.resolve({ obtained: 8 });
		await clock.advance(0);
		expect(queue.getEntryState(KEY)).toBeUndefined();
	});

	test("caps the backoff at 30 seconds", async () => {
		const { clock, sender, queue } = setup();
		queue.enqueue(KEY, request(1));
		queue.flush(KEY);
		for (let i = 0; i < 8; i++) {
			sender.calls.at(-1)?.reject(trpcError("TOO_MANY_REQUESTS", 429));
			await clock.advance(0);
			const state = queue.getEntryState(KEY);
			expect((state?.nextRetryAt ?? 0) - clock.now()).toBeLessThanOrEqual(
				30_000,
			);
			await clock.advance(30_000);
		}
		expect(queue.getEntryState(KEY)?.attempt).toBe(8);
		expect(sender.calls).toHaveLength(9);
	});

	test("BAD_REQUEST is terminal until retried manually", async () => {
		const { clock, sender, queue } = setup();
		queue.enqueue(KEY, request(200));
		await clock.advance(600);
		sender.calls[0]?.reject(trpcError("BAD_REQUEST", 400));
		await clock.advance(0);

		const state = queue.getEntryState(KEY);
		expect(state?.status).toBe("failed");
		expect(state?.error).toBe("BAD_REQUEST");
		expect(queue.getSummary().failed).toBe(1);
		await clock.advance(120_000);
		expect(sender.calls).toHaveLength(1);

		queue.retryNow();
		expect(sender.calls).toHaveLength(2);
		expect(queue.getEntryState(KEY)?.status).toBe("saving");
		sender.calls[1]?.resolve({ obtained: 200 });
		await clock.advance(0);
		expect(queue.getEntryState(KEY)).toBeUndefined();
	});

	test("cancel drops an unsent value", async () => {
		const { clock, sender, queue } = setup();
		queue.enqueue(KEY, request(3));
		queue.cancel(KEY);
		await clock.advance(1_000);
		expect(sender.calls).toHaveLength(0);
		expect(queue.getEntryState(KEY)).toBeUndefined();
	});

	test("cancel during flight never retries that value", async () => {
		const { clock, sender, queue } = setup();
		queue.enqueue(KEY, request(3));
		queue.flush(KEY);
		queue.cancel(KEY);
		sender.calls[0]?.reject(networkError());
		await clock.advance(60_000);
		expect(sender.calls).toHaveLength(1);
		expect(queue.getEntryState(KEY)).toBeUndefined();
	});

	test("online and visibility events retry immediately", async () => {
		let online = false;
		const windowTarget = new EventTarget();
		const documentTarget = Object.assign(new EventTarget(), {
			visibilityState: "hidden" as DocumentVisibilityState,
		});
		const { clock, sender, queue } = setup({
			isOnline: () => online,
			windowTarget,
			documentTarget,
		});

		queue.enqueue(KEY, request(6));
		await clock.advance(600);
		// Offline: nothing is sent, the entry waits.
		expect(sender.calls).toHaveLength(0);
		expect(queue.getEntryState(KEY)?.status).toBe("retrying");
		expect(queue.getSummary().offline).toBe(true);

		online = true;
		windowTarget.dispatchEvent(new Event("online"));
		expect(sender.calls).toHaveLength(1);
		expect(queue.getSummary().offline).toBe(false);

		sender.calls[0]?.reject(networkError());
		await clock.advance(0);
		expect(queue.getEntryState(KEY)?.attempt).toBe(1);

		documentTarget.visibilityState = "visible";
		documentTarget.dispatchEvent(new Event("visibilitychange"));
		expect(sender.calls).toHaveLength(2);
	});

	test("warns before unload only while work is unsaved", async () => {
		const windowTarget = new EventTarget();
		const { clock, sender, queue } = setup({ windowTarget });
		const unload = () => {
			const event = new Event("beforeunload", { cancelable: true });
			windowTarget.dispatchEvent(event);
			return event.defaultPrevented;
		};

		expect(unload()).toBe(false);
		queue.enqueue(KEY, request(2));
		expect(unload()).toBe(true);
		await clock.advance(600);
		sender.calls[0]?.resolve({ obtained: 2 });
		await clock.advance(0);
		expect(unload()).toBe(false);
	});

	test("persists pending entries and resumes them after a reload", async () => {
		const storage = createMemoryStorage();
		const first = setup({ storage });
		first.queue.enqueue(KEY, request(11));
		first.queue.enqueue("stf-2:7", request(4));

		const stored = JSON.parse(
			storage.getItem(SCORE_OUTBOX_STORAGE_KEY) ?? "{}",
		);
		expect(stored.entries).toHaveLength(2);
		expect(stored.entries[0]).toMatchObject({
			key: KEY,
			kind: "authenticated",
			payload: { obtained: 11 },
		});
		first.queue.dispose();

		// "Reload": a fresh queue over the same storage.
		const second = setup({ storage });
		second.queue.resume();
		expect(second.queue.getEntryState(KEY)?.value).toBe(11);
		expect(second.sender.calls).toHaveLength(2);

		// Failures keep the entry stored.
		second.sender.calls[0]?.reject(networkError());
		second.sender.calls[1]?.resolve({ obtained: 4 });
		await second.clock.advance(0);
		const afterFirst = JSON.parse(
			storage.getItem(SCORE_OUTBOX_STORAGE_KEY) ?? "{}",
		);
		expect(afterFirst.entries.map((e: { key: string }) => e.key)).toEqual([
			KEY,
		]);

		await second.clock.advance(1_000);
		second.sender.calls[2]?.resolve({ obtained: 11 });
		await second.clock.advance(0);
		expect(storage.getItem(SCORE_OUTBOX_STORAGE_KEY)).toBeNull();
	});

	test("drops persisted entries older than 7 days", () => {
		const clock = createFakeClock();
		const storage = createMemoryStorage({
			[SCORE_OUTBOX_STORAGE_KEY]: JSON.stringify({
				entries: [
					{
						key: "old",
						kind: "authenticated",
						payload: request(1).payload,
						queuedAt: clock.now() - SCORE_OUTBOX_MAX_AGE_MS - 1,
					},
					{
						key: "fresh",
						kind: "authenticated",
						payload: request(2).payload,
						queuedAt: clock.now() - 1_000,
					},
				],
			}),
		});
		const sender = createManualSender();
		const queue = createScoreSaveQueue({
			send: sender.send,
			storage,
			now: clock.now,
			setTimer: clock.setTimer,
			clearTimer: clock.clearTimer,
		});
		queue.resume();
		expect(queue.getEntryState("old")).toBeUndefined();
		expect(queue.getEntryState("fresh")?.value).toBe(2);
		expect(sender.calls.map((call) => call.request.payload.obtained)).toEqual([
			2,
		]);
		const stored = JSON.parse(
			storage.getItem(SCORE_OUTBOX_STORAGE_KEY) ?? "{}",
		);
		expect(stored.entries.map((e: { key: string }) => e.key)).toEqual([
			"fresh",
		]);
	});

	test("survives broken storage", async () => {
		const { clock, sender, queue } = setup({
			storage: {
				getItem: () => {
					throw new Error("blocked");
				},
				setItem: () => {
					throw new Error("quota");
				},
				removeItem: () => {
					throw new Error("blocked");
				},
			},
		});
		queue.resume();
		queue.enqueue(KEY, request(1));
		await clock.advance(600);
		expect(sender.calls).toHaveLength(1);
	});

	test("keeps state snapshots referentially stable", () => {
		const { queue } = setup();
		queue.enqueue(KEY, request(1));
		const first = queue.getEntryState(KEY);
		const summary = queue.getSummary();
		queue.enqueue("other", request(2));
		expect(queue.getEntryState(KEY)).toBe(first);
		expect(queue.getSummary()).not.toBe(summary);
	});
});

describe("isRetryableScoreSaveError", () => {
	test("retries transient failures", () => {
		expect(isRetryableScoreSaveError(networkError())).toBe(true);
		expect(isRetryableScoreSaveError(new TypeError("fetch failed"))).toBe(true);
		for (const [code, status] of [
			["INTERNAL_SERVER_ERROR", 500],
			["TIMEOUT", 408],
			["TOO_MANY_REQUESTS", 429],
			["CLIENT_CLOSED_REQUEST", 499],
			["CONFLICT", 409],
		] as const) {
			expect(isRetryableScoreSaveError(trpcError(code, status))).toBe(true);
		}
		expect(
			isRetryableScoreSaveError(
				Object.assign(new Error("x"), { data: { httpStatus: 503 } }),
			),
		).toBe(true);
	});

	test("does not retry client errors", () => {
		for (const [code, status] of [
			["BAD_REQUEST", 400],
			["UNAUTHORIZED", 401],
			["FORBIDDEN", 403],
			["NOT_FOUND", 404],
			["PARSE_ERROR", 400],
		] as const) {
			expect(isRetryableScoreSaveError(trpcError(code, status))).toBe(false);
		}
	});
});
