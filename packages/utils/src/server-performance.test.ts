import { describe, expect, test, spyOn } from "bun:test";
import {
	getPerformanceRequestId,
	withPerformanceContext,
	logPerformance,
} from "./server-performance";

describe("request tracing", () => {
	test("keeps parallel request contexts isolated and preserves explicit transport IDs", async () => {
		const previous = process.env.DEBUG_PERF;
		process.env.DEBUG_PERF = "true";
		const calls: Array<Parameters<typeof console.info>> = [];
		const logger = spyOn(console, "info").mockImplementation((...args) => {
			calls.push(args);
		});
		try {
			await Promise.all(
				["tenant-a", "tenant-b"].map((id) =>
					withPerformanceContext(id, async () => {
						await Promise.resolve();
						logPerformance("db.operation", performance.now(), {
							model: "SchoolProfile",
							operation: "findFirst",
						});
					}),
				),
			);
			logPerformance("ssr.trpc.fetch", performance.now(), {
				requestId: "transport-id",
			});
			const logs = calls.map((args) => JSON.parse(args[1]));
			expect(logs.map((log) => log.requestId)).toEqual([
				"tenant-a",
				"tenant-b",
				"transport-id",
			]);
			expect(logs.every((log) => !("token" in log) && !("sql" in log))).toBe(
				true,
			);
		} finally {
			logger.mockRestore();
			if (previous === undefined) {
				// biome-ignore lint/performance/noDelete: Node env assignment would stringify undefined instead of removing the key.
				delete process.env.DEBUG_PERF;
			} else process.env.DEBUG_PERF = previous;
		}
	});
	test("rejects multiline/unbounded request IDs", () => {
		expect(getPerformanceRequestId("valid-id_1")).toBe("valid-id_1");
		expect(getPerformanceRequestId("unsafe\nvalue")).not.toBe("unsafe\nvalue");
		expect(getPerformanceRequestId("x".repeat(81))).not.toBe("x".repeat(81));
	});
});
