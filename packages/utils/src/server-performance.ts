import { AsyncLocalStorage } from "node:async_hooks";

type PerformanceContext = { requestId: string };
const requestContext = new AsyncLocalStorage<PerformanceContext>();

export function withPerformanceContext<T>(
	requestId: string,
	operation: () => T,
): T {
	return requestContext.run({ requestId }, operation);
}

export function getPerformanceRequestId(value?: string | null) {
	return value && /^[a-zA-Z0-9_-]{1,80}$/.test(value)
		? value
		: crypto.randomUUID();
}

export function logPerformance(
	stage: string,
	startedAt: number,
	details: Record<string, string | number | boolean | null> = {},
) {
	const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
	if (process.env.DEBUG_PERF !== "true" && durationMs < 1_000) return;
	console.info(
		"[performance]",
		JSON.stringify({
			...details,
			stage,
			durationMs,
			requestId: requestContext.getStore()?.requestId ?? details.requestId,
			region: process.env.VERCEL_REGION ?? null,
		}),
	);
}

export async function measurePerformance<T>(
	stage: string,
	operation: () => Promise<T>,
): Promise<T> {
	const startedAt = performance.now();
	try {
		return await operation();
	} finally {
		logPerformance(stage, startedAt);
	}
}
