import type { ActivityTypeName } from "@school-clerk/utils/activity";
import { STAFF_ROLES } from "@school-clerk/utils/constants";
import type { ActivityType, Prisma } from "./generated/client";
import type { Database, DatabaseTransaction } from "./prisma";

/**
 * Opt-in activity notification rules (ADR-0093). A missing row means the
 * type is recorded but never notifies.
 */

type RuleDatabase =
	| Pick<Database, "activityNotificationRule" | "user">
	| Pick<DatabaseTransaction, "activityNotificationRule" | "user">;

/** Lower-case role names a rule may target. */
export const ACTIVITY_NOTIFICATION_ROLES = STAFF_ROLES.map((role) =>
	role.toLowerCase(),
);

export type ActivityNotificationRuleView = {
	type: ActivityTypeName;
	enabled: boolean;
	inApp: boolean;
	email: boolean;
	roles: string[];
	userIds: string[];
	updatedAt: Date | null;
	updatedByUserId: string | null;
};

const ruleSelect = {
	type: true,
	enabled: true,
	inApp: true,
	email: true,
	roles: true,
	userIds: true,
	updatedAt: true,
	updatedByUserId: true,
} satisfies Prisma.ActivityNotificationRuleSelect;

export class ActivityNotificationRuleError extends Error {
	constructor(
		public readonly code: "INVALID_ROLE" | "INVALID_USER",
		message: string,
	) {
		super(message);
		this.name = "ActivityNotificationRuleError";
	}
}

/** One entry per requested type; types without a stored row are off. */
export async function listActivityNotificationRules(
	db: RuleDatabase,
	input: { schoolId: string; types: readonly ActivityTypeName[] },
): Promise<ActivityNotificationRuleView[]> {
	const rows = await db.activityNotificationRule.findMany({
		where: {
			schoolProfileId: input.schoolId,
			type: { in: [...input.types] as ActivityType[] },
		},
		select: ruleSelect,
	});
	const byType = new Map(rows.map((row) => [row.type as string, row]));
	return input.types.map((type) => {
		const row = byType.get(type);
		return row
			? { ...row, type }
			: {
					type,
					enabled: false,
					inApp: true,
					email: false,
					roles: [],
					userIds: [],
					updatedAt: null,
					updatedByUserId: null,
				};
	});
}

/** Enabled rules only — the fan-out hot path. */
export function listEnabledActivityNotificationRules(
	db:
		| Pick<Database, "activityNotificationRule">
		| Pick<DatabaseTransaction, "activityNotificationRule">,
	input: { schoolId: string },
) {
	return db.activityNotificationRule.findMany({
		where: { schoolProfileId: input.schoolId, enabled: true },
		select: {
			type: true,
			inApp: true,
			email: true,
			roles: true,
			userIds: true,
		},
	});
}

function schoolUserWhere(accountId: string): Prisma.UserWhereInput {
	return {
		saasAccountId: accountId,
		deletedAt: null,
		tenant: { deletedAt: null, qaPurgeStartedAt: null },
	};
}

function roleWhere(roles: readonly string[]): Prisma.UserWhereInput[] {
	return roles.map((role) => ({
		role: { equals: role, mode: "insensitive" as const },
	}));
}

/** Staff users a rule may target (pickers + validation). */
export function listActivityNotificationCandidates(
	db: Pick<Database, "user"> | Pick<DatabaseTransaction, "user">,
	input: {
		accountId: string;
	},
) {
	return db.user.findMany({
		where: {
			...schoolUserWhere(input.accountId),
			OR: roleWhere(ACTIVITY_NOTIFICATION_ROLES),
		},
		select: { id: true, name: true, email: true, role: true },
		orderBy: { name: "asc" },
	});
}

export async function upsertActivityNotificationRule(
	db: RuleDatabase,
	input: {
		schoolId: string;
		accountId: string;
		type: ActivityTypeName;
		enabled: boolean;
		inApp: boolean;
		email: boolean;
		roles: readonly string[];
		userIds: readonly string[];
		updatedByUserId: string;
	},
): Promise<ActivityNotificationRuleView> {
	const roles = [
		...new Set(
			input.roles.map((role) => role.trim().toLowerCase()).filter(Boolean),
		),
	];
	const invalidRole = roles.find(
		(role) => !ACTIVITY_NOTIFICATION_ROLES.includes(role),
	);
	if (invalidRole) {
		throw new ActivityNotificationRuleError(
			"INVALID_ROLE",
			`"${invalidRole}" is not a staff role.`,
		);
	}
	const userIds = [...new Set(input.userIds.filter(Boolean))];
	if (userIds.length) {
		const found = await db.user.findMany({
			where: {
				...schoolUserWhere(input.accountId),
				id: { in: userIds },
				OR: roleWhere(ACTIVITY_NOTIFICATION_ROLES),
			},
			select: { id: true },
		});
		if (found.length !== userIds.length) {
			throw new ActivityNotificationRuleError(
				"INVALID_USER",
				"Every recipient must be a staff member of this school.",
			);
		}
	}
	const data = {
		enabled: input.enabled,
		inApp: input.inApp,
		email: input.email,
		roles,
		userIds,
		updatedByUserId: input.updatedByUserId,
	};
	const row = await db.activityNotificationRule.upsert({
		where: {
			schoolProfileId_type: {
				schoolProfileId: input.schoolId,
				type: input.type as ActivityType,
			},
		},
		create: {
			schoolProfileId: input.schoolId,
			type: input.type as ActivityType,
			...data,
		},
		update: data,
		select: ruleSelect,
	});
	return { ...row, type: input.type };
}

/**
 * Live recipients of a rule: account staff whose role is in `roles`, plus the
 * explicit `userIds`, excluding deleted users, purging accounts and (by
 * default) the actor. Read policy is checked separately per recipient.
 */
export async function resolveActivityNotificationRecipients(
	db: Pick<Database, "user"> | Pick<DatabaseTransaction, "user">,
	input: {
		accountId: string;
		roles: readonly string[];
		userIds: readonly string[];
		actorUserId: string;
		includeActor?: boolean;
	},
) {
	const or: Prisma.UserWhereInput[] = [...roleWhere(input.roles)];
	if (input.userIds.length) or.push({ id: { in: [...input.userIds] } });
	if (!or.length) return [];
	const users = await db.user.findMany({
		where: { ...schoolUserWhere(input.accountId), OR: or },
		select: { id: true, name: true, email: true, role: true },
		orderBy: { createdAt: "asc" },
	});
	return input.includeActor
		? users
		: users.filter((user) => user.id !== input.actorUserId);
}
