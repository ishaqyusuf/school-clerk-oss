// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";
import {
	createWorkspaceProfileLoader,
	WorkspaceProfileError,
} from "./workspace-profile";

describe("workspace profile reads", () => {
	test("concurrent consumers share a request, then the next read sees changed term context", async () => {
		let calls = 0;
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const load = createWorkspaceProfileLoader(async (_url, options) => {
			calls++;
			expect(options?.cache).toBe("no-store");
			expect(options?.signal).toBeInstanceOf(AbortSignal);
			await gate;
			return Response.json({ termId: calls === 1 ? "first" : "second" });
		});
		const first = load();
		const concurrent = load();
		expect(first).toBe(concurrent);
		release();
		expect((await first).termId).toBe("first");
		expect((await load()).termId).toBe("second");
		expect(calls).toBe(2);
	});

	test.each([401, 503])(
		"HTTP %i is preserved and a failed request can recover",
		async (status) => {
			let calls = 0;
			const load = createWorkspaceProfileLoader(async () =>
				++calls === 1
					? new Response(null, { status })
					: Response.json({ schoolId: "recovered" }),
			);
			try {
				await load();
				throw new Error("Expected profile failure");
			} catch (error) {
				expect(error).toBeInstanceOf(WorkspaceProfileError);
				expect((error as WorkspaceProfileError).status).toBe(status);
			}
			expect((await load()).schoolId).toBe("recovered");
		},
	);

	test("network failures remain network failures, not signed-out responses", async () => {
		const failure = new TypeError("Network unavailable");
		let calls = 0;
		const load = createWorkspaceProfileLoader(async () => {
			if (++calls === 1) throw failure;
			return Response.json({ schoolId: "recovered" });
		});
		await expect(load()).rejects.toBe(failure);
		expect((await load()).schoolId).toBe("recovered");
	});
});
