import { describe, expect, it } from "bun:test";
import { MODULE_IDS } from "@school-clerk/utils/module-config";
import type { TRPCContext } from "../trpc/init";
import {
	dispatchPendingActivityNotifications,
	invalidateActivityNotificationRuleCache,
} from "./activity-notifications";

const moduleConfiguration = {
	version: 1,
	revision: 1,
	enabledModules: [...MODULE_IDS],
	entitledModules: [...MODULE_IDS],
};

const activity = {
	id: "act-1",
	type: "attendance_created",
	userId: "actor-1",
	author: "Aisha Bello",
	source: "user",
	title: "Attendance taken",
	description: null,
	meta: {
		attendanceId: "att-1",
		classroom: { id: "class-1", name: "Primary 3A" },
		date: "2026-11-13",
		counts: {
			total: 30,
			present: 28,
			absent: 2,
			late: 0,
			excused: 0,
			leave: 0,
		},
	},
	subjectType: "attendance",
	subjectId: "att-1",
	createdAt: new Date(),
};

function createFakeContext(options: {
	schoolId: string;
	rules: {
		type: string;
		inApp: boolean;
		email: boolean;
		roles: string[];
		userIds: string[];
	}[];
	claimCount?: number;
}) {
	const calls = {
		ruleQueries: 0,
		activityQueries: 0,
		claims: [] as unknown[],
		recipientQueries: 0,
		notifications: [] as Record<string, unknown>[],
	};
	const db = {
		activityNotificationRule: {
			findMany: async () => {
				calls.ruleQueries += 1;
				return options.rules;
			},
		},
		activity: {
			findMany: async () => {
				calls.activityQueries += 1;
				return [activity];
			},
			updateMany: async (args: unknown) => {
				calls.claims.push(args);
				return { count: options.claimCount ?? 1 };
			},
		},
		user: {
			findMany: async () => {
				calls.recipientQueries += 1;
				return [
					{
						id: "actor-1",
						name: "Aisha Bello",
						email: "aisha@example.test",
						role: "Admin",
					},
					{
						id: "teacher-1",
						name: "Musa Ali",
						email: "musa@example.test",
						role: "Teacher",
					},
				];
			},
			findFirst: async ({ where }: { where: { id: string } }) => ({
				id: where.id,
				name: "Musa Ali",
				email: "musa@example.test",
				role: "Teacher",
			}),
		},
		schoolProfile: {
			findFirst: async () => ({
				id: options.schoolId,
				accountId: "account-1",
				name: "Greenfield Academy",
				subDomain: "greenfield",
				moduleConfiguration,
			}),
		},
		session: {
			findFirst: async () => ({
				user: { id: "actor-1", name: "Aisha Bello", role: "Admin" },
			}),
		},
		notificationPreference: { findFirst: async () => null },
		notificationContact: {
			findFirst: async ({ where }: { where: { userId?: string } }) => ({
				id: `contact-${where.userId}`,
			}),
			create: async () => ({ id: "contact-new" }),
			update: async () => ({ id: "contact-new" }),
		},
		notification: {
			create: async ({ data }: { data: Record<string, unknown> }) => {
				calls.notifications.push(data);
				return { id: "notification-1" };
			},
		},
		$transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
			callback(db),
	};
	const ctx = {
		db,
		profile: { schoolId: options.schoolId, authSessionId: "session-1" },
		currentUser: {
			id: "actor-1",
			email: "aisha@example.test",
			name: "Aisha Bello",
			role: "Admin",
			saasAccountId: "account-1",
		},
	} as unknown as TRPCContext;
	return { ctx, calls };
}

describe("dispatchPendingActivityNotifications", () => {
	it("stops after one cached rule lookup when nothing is enabled", async () => {
		const { ctx, calls } = createFakeContext({
			schoolId: "school-quiet",
			rules: [],
		});
		await dispatchPendingActivityNotifications(ctx, { since: new Date() });
		await dispatchPendingActivityNotifications(ctx, { since: new Date() });
		expect(calls.ruleQueries).toBe(1);
		expect(calls.activityQueries).toBe(0);
		invalidateActivityNotificationRuleCache("school-quiet");
	});

	it("skips activities another request already claimed", async () => {
		const { ctx, calls } = createFakeContext({
			schoolId: "school-race",
			rules: [
				{
					type: "attendance_created",
					inApp: true,
					email: false,
					roles: ["teacher"],
					userIds: [],
				},
			],
			claimCount: 0,
		});
		await dispatchPendingActivityNotifications(ctx, { since: new Date() });
		expect(calls.claims).toEqual([
			{
				where: { id: "act-1", notifiedAt: null },
				data: { notifiedAt: expect.any(Date) },
			},
		]);
		expect(calls.recipientQueries).toBe(0);
		expect(calls.notifications).toHaveLength(0);
		invalidateActivityNotificationRuleCache("school-race");
	});

	it("delivers an in-app notice to rule recipients except the actor", async () => {
		const { ctx, calls } = createFakeContext({
			schoolId: "school-live",
			rules: [
				{
					type: "attendance_created",
					inApp: true,
					email: false,
					roles: ["teacher", "admin"],
					userIds: [],
				},
			],
		});
		await dispatchPendingActivityNotifications(ctx, { since: new Date() });
		expect(calls.notifications).toHaveLength(1);
		const [notification] = calls.notifications;
		expect(notification?.userId).toBe("teacher-1");
		expect(notification?.type).toBe("activity.attendance_created");
		expect(notification?.title).toBe("Attendance taken");
		expect(notification?.body).toBe(
			"Aisha Bello took attendance for Primary 3A on 13 Nov — 28 present · 2 absent",
		);
		expect(notification?.link).toBe(
			"/academic/classes?viewClassroomId=class-1&classroomTab=attendance&attendanceSessionId=att-1&secondaryTab=attendance-overview",
		);
		expect(notification?.action).toEqual({
			kind: "activity",
			activityId: "act-1",
			type: "attendance_created",
			target: {
				kind: "attendance",
				attendanceId: "att-1",
				classroomId: "class-1",
				date: "2026-11-13",
			},
		});
		invalidateActivityNotificationRuleCache("school-live");
	});

	it("never throws into the mutation", async () => {
		const { ctx } = createFakeContext({ schoolId: "school-broken", rules: [] });
		(
			ctx.db as unknown as {
				activityNotificationRule: { findMany: () => Promise<never> };
			}
		).activityNotificationRule.findMany = async () => {
			throw new Error("db down");
		};
		await expect(
			dispatchPendingActivityNotifications(ctx, { since: new Date() }),
		).resolves.toBeUndefined();
	});
});
