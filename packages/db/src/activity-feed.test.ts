import { describe, expect, test } from "bun:test";

import {
	buildActivityFeedWhere,
	decodeActivityCursor,
	encodeActivityCursor,
} from "./activity-feed";

const scope = {
	schoolId: "school-1",
	viewer: { userId: "user-1", canViewAll: false },
	allowedTypes: ["attendance_created", "student_created"] as const,
};

describe("activity cursor", () => {
	test("round-trips createdAt and id", () => {
		const createdAt = new Date("2026-11-13T09:30:00Z");
		const cursor = encodeActivityCursor({ createdAt, id: "abc:def" });
		expect(decodeActivityCursor(cursor)).toEqual({ createdAt, id: "abc:def" });
	});

	test("rejects malformed cursors", () => {
		expect(encodeActivityCursor({ createdAt: null, id: "x" })).toBeNull();
		expect(decodeActivityCursor("")).toBeNull();
		expect(decodeActivityCursor("nope")).toBeNull();
		expect(decodeActivityCursor("12.5:x")).toBeNull();
		expect(decodeActivityCursor("123:")).toBeNull();
	});
});

describe("buildActivityFeedWhere", () => {
	test("pins non-admin viewers to their own rows and ignores member filters", () => {
		const where = buildActivityFeedWhere(
			{ ...scope, allowedTypes: [...scope.allowedTypes] },
			{ userIds: ["user-2"] },
		);
		expect(where.userId).toBe("user-1");
		expect(where.schoolProfileId).toBe("school-1");
		expect(where.deletedAt).toBeNull();
	});

	test("lets admins filter by member", () => {
		const where = buildActivityFeedWhere(
			{
				...scope,
				allowedTypes: [...scope.allowedTypes],
				viewer: { userId: "user-1", canViewAll: true },
			},
			{ userIds: ["user-2"] },
		);
		expect(where.userId).toEqual({ in: ["user-2"] });
		expect(
			buildActivityFeedWhere({
				...scope,
				allowedTypes: [...scope.allowedTypes],
				viewer: { userId: "u", canViewAll: true },
			}).userId,
		).toBeUndefined();
	});

	test("intersects requested types with the allowed types", () => {
		const where = buildActivityFeedWhere(
			{ ...scope, allowedTypes: [...scope.allowedTypes] },
			{ types: ["student_created", "student_payment_received"] },
		);
		expect(where.type).toEqual({ in: ["student_created"] });
	});

	test("matches student subjects through the meta snapshot", () => {
		const where = buildActivityFeedWhere(
			{ ...scope, allowedTypes: [...scope.allowedTypes] },
			{ subject: { type: "student", id: "student-1" }, q: " Musa " },
		);
		expect(where.AND).toEqual([
			{
				OR: [
					{ title: { contains: "Musa", mode: "insensitive" } },
					{ description: { contains: "Musa", mode: "insensitive" } },
					{ author: { contains: "Musa", mode: "insensitive" } },
				],
			},
			{
				OR: [
					{ subjectType: "student", subjectId: "student-1" },
					{ meta: { path: ["student", "id"], equals: "student-1" } },
					{ meta: { path: ["studentId"], equals: "student-1" } },
				],
			},
		]);
	});
});
