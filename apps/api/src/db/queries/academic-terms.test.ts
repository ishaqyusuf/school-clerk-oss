import { describe, expect, test } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import {
	updateAcademicSessionMetadata,
	updateAcademicTermMetadata,
} from "./academic-terms";

process.env.DATABASE_URL ??=
	"postgresql://postgres:postgres@127.0.0.1:55432/school_clerk";

function createTermMetadataContext(
	lifecycleStatus: "DRAFT" | "READY" | "ACTIVE" | "CLOSED" | null,
	activeSessionTermId = lifecycleStatus === "ACTIVE" ? "term-1" : null,
) {
	const lookups: Record<string, unknown>[] = [];
	const updates: Record<string, unknown>[] = [];
	const ctx = {
		profile: { schoolId: "school-1" },
		currentUser: { id: "admin-1", role: "Admin" },
		db: {
			schoolProfile: {
				findFirst: async () => ({ id: "school-1", activeSessionTermId }),
			},
			sessionTerm: {
				findFirst: async ({ where }: { where: Record<string, unknown> }) => {
					lookups.push(where);
					if (where.id === "term-1") {
						return {
							id: "term-1",
							lifecycleStatus,
							sessionId: "session-1",
							title: "Second Term",
						};
					}
					return null;
				},
				update: async ({ data }: { data: Record<string, unknown> }) => {
					updates.push(data);
					return { id: "term-1", lifecycleStatus, ...data };
				},
			},
		},
	} as unknown as TRPCContext;

	return { ctx, lookups, updates };
}

describe("updateAcademicSessionMetadata", () => {
	test("renames the current tenant session and updates its optional dates", async () => {
		const updates: Record<string, unknown>[] = [];
		const lookups: Record<string, unknown>[] = [];
		const ctx = {
			profile: { schoolId: "school-1" },
			currentUser: { id: "admin-1", role: "Admin" },
			db: {
				schoolProfile: {
					findFirst: async () => ({ id: "school-1" }),
				},
				schoolSession: {
					findFirst: async ({ where }: { where: { id?: unknown } }) => {
						lookups.push(where);
						if (where.id === "session-1") {
							return { id: "session-1", title: "1447/1448" };
						}
						return null;
					},
					update: async ({ data }: { data: Record<string, unknown> }) => {
						updates.push(data);
						return { id: "session-1", ...data };
					},
				},
			},
		} as unknown as TRPCContext;

		const result = await updateAcademicSessionMetadata(ctx, {
			sessionId: "session-1",
			title: "2026/2027",
			startDate: new Date("2026-09-01"),
			endDate: new Date("2027-07-31"),
		});

		expect(lookups[0]).toEqual({
			id: "session-1",
			schoolId: "school-1",
			deletedAt: null,
		});
		expect(updates).toEqual([
			{
				title: "2026/2027",
				startDate: new Date("2026-09-01"),
				endDate: new Date("2027-07-31"),
			},
		]);
		expect(result).toMatchObject({
			id: "session-1",
			title: "2026/2027",
		});
	});
});

describe("updateAcademicTermMetadata", () => {
	test("renames an active tenant term without changing its locked calendar", async () => {
		const { ctx, lookups, updates } = createTermMetadataContext("ACTIVE");

		const result = await updateAcademicTermMetadata(ctx, {
			termId: "term-1",
			title: "Term Two",
			startDate: new Date("2026-01-05"),
			endDate: new Date("2026-04-01"),
			note: null,
		});

		expect(lookups[0]).toEqual({
			id: "term-1",
			schoolId: "school-1",
			deletedAt: null,
		});
		expect(updates).toEqual([{ title: "Term Two" }]);
		expect(result).toMatchObject({
			title: "Term Two",
			lifecycleStatus: "ACTIVE",
		});
	});

	test("locks the calendar for a legacy term selected as current", async () => {
		const { ctx, updates } = createTermMetadataContext(null, "term-1");

		await updateAcademicTermMetadata(ctx, {
			termId: "term-1",
			title: "Current Term",
			startDate: null,
			endDate: null,
			note: null,
		});

		expect(updates).toEqual([{ title: "Current Term" }]);
	});

	test("preserves a ready term's note when quick editing omits it", async () => {
		const { ctx, updates } = createTermMetadataContext("READY");

		await updateAcademicTermMetadata(ctx, {
			termId: "term-1",
			title: "Final Term",
			startDate: new Date("2026-04-15"),
			endDate: new Date("2026-07-15"),
		});

		expect(updates).toEqual([
			{
				title: "Final Term",
				startDate: new Date("2026-04-15"),
				endDate: new Date("2026-07-15"),
			},
		]);
	});

	test("keeps closed term metadata immutable", async () => {
		const { ctx, updates } = createTermMetadataContext("CLOSED");

		await expect(
			updateAcademicTermMetadata(ctx, {
				termId: "term-1",
				title: "Renamed First Term",
				startDate: null,
				endDate: null,
				note: null,
			}),
		).rejects.toMatchObject({
			code: "CONFLICT",
			message: "A closed term cannot be edited.",
		});
		expect(updates).toEqual([]);
	});
});
