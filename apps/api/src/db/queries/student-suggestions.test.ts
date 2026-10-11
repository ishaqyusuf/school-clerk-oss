import { describe, expect, mock, test } from "bun:test";
import { resolve } from "node:path";
import type { TRPCContext } from "../../trpc/init";

const read = mock(async () => ({
	data: [],
	meta: { count: 0, matchingCount: 0, cursor: null },
}));
const login = mock(async () => ({ id: "login" }));
mock.module(resolve(import.meta.dir, "../../trpc/init.ts"), () => ({
	findAuthSessionByBearer: login,
}));
mock.module("@school-clerk/db", () => ({ getStudentSuggestions: read }));
const { readStudentSuggestions } = await import("./student-suggestions");

const scope = {
	schoolId: "school",
	userId: "user",
	loginSessionId: "login",
	sessionId: "session",
	termId: "term",
};
const input = {
	name: "Amina",
	surname: "Yusuf",
	otherName: "",
	pageSize: 5,
	viewScope: scope,
};
function context(term: { id: string } | null = { id: "term" }) {
	return {
		profile: {
			schoolId: "school",
			sessionId: "session",
			termId: "term",
			authSessionId: "bearer",
		},
		currentUser: { id: "user" },
		db: { sessionTerm: { findFirst: mock(async () => term) } },
	} as unknown as TRPCContext;
}
describe("student suggestion workspace guard", () => {
	test("rejects a stale school or academic scope before any search", async () => {
		const before = read.mock.calls.length;
		for (const key of ["schoolId", "sessionId", "termId", "userId"] as const) {
			await expect(
				readStudentSuggestions(context(), {
					...input,
					viewScope: { ...scope, [key]: "stale" },
				}),
			).rejects.toMatchObject({ code: "FORBIDDEN" });
		}
		expect(read.mock.calls.length).toBe(before);
	});
	test("rejects a different login session before any search", async () => {
		const before = read.mock.calls.length;
		await expect(
			readStudentSuggestions(context(), {
				...input,
				viewScope: { ...scope, loginSessionId: "stale" },
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(read.mock.calls.length).toBe(before);
	});
	test("rejects an unavailable school-owned term before any search", async () => {
		const before = read.mock.calls.length;
		await expect(
			readStudentSuggestions(context(null), input),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(read.mock.calls.length).toBe(before);
	});
	test("uses server scope and validates live school/session ancestry", async () => {
		const ctx = context();
		await readStudentSuggestions(ctx, input);
		expect(ctx.db.sessionTerm.findFirst).toHaveBeenCalledWith({
			where: {
				id: "term",
				schoolId: "school",
				sessionId: "session",
				deletedAt: null,
				session: { schoolId: "school", deletedAt: null },
			},
			select: { id: true },
		});
		expect(read).toHaveBeenLastCalledWith(ctx.db, {
			name: "Amina",
			surname: "Yusuf",
			otherName: "",
			cursor: undefined,
			pageSize: 5,
			schoolId: "school",
			sessionId: "session",
			termId: "term",
			nameFormat: undefined,
		});
	});
});
