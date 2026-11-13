import type {
	ActivitySubject,
	ActivityTypeName,
} from "@school-clerk/utils/activity";
import type { ActivityType, Prisma } from "./generated/client";
import type { Database, DatabaseTransaction } from "./prisma";

/**
 * Activity feed reads (ADR-0093). Every query is school-scoped, excludes
 * soft-deleted rows and is limited to `allowedTypes` (the caller's module/role
 * read policy). Viewers without `canViewAll` only ever see their own rows.
 */

type ActivityReader =
	| Pick<Database, "activity" | "user">
	| Pick<DatabaseTransaction, "activity" | "user">;

export type ActivityViewer = { userId: string; canViewAll: boolean };

export type ActivityFeedScope = {
	schoolId: string;
	viewer: ActivityViewer;
	allowedTypes: readonly ActivityTypeName[];
};

export type ActivityFeedFilters = {
	from?: Date | null;
	to?: Date | null;
	types?: readonly string[] | null;
	/** Ignored for viewers without `canViewAll`. */
	userIds?: readonly string[] | null;
	q?: string | null;
	subject?: ActivitySubject | { type: string; id: string } | null;
};

export const activityFeedSelect = {
	id: true,
	type: true,
	userId: true,
	author: true,
	source: true,
	title: true,
	description: true,
	meta: true,
	subjectType: true,
	subjectId: true,
	createdAt: true,
} satisfies Prisma.ActivitySelect;

export type ActivityFeedRow = Prisma.ActivityGetPayload<{
	select: typeof activityFeedSelect;
}>;

/** Opaque keyset cursor over (createdAt desc, id desc). */
export function encodeActivityCursor(row: {
	createdAt: Date | null;
	id: string;
}) {
	return row.createdAt ? `${row.createdAt.getTime()}:${row.id}` : null;
}

export function decodeActivityCursor(cursor: string | null | undefined) {
	if (!cursor) return null;
	const separator = cursor.indexOf(":");
	if (separator <= 0) return null;
	const time = Number(cursor.slice(0, separator));
	const id = cursor.slice(separator + 1);
	if (!Number.isSafeInteger(time) || !id) return null;
	return { createdAt: new Date(time), id };
}

function subjectWhere(subject: {
	type: string;
	id: string;
}): Prisma.ActivityWhereInput {
	const or: Prisma.ActivityWhereInput[] = [
		{ subjectType: subject.type, subjectId: subject.id },
	];
	if (subject.type === "student") {
		// Payments/withdrawals are about another subject but carry the student.
		or.push(
			{ meta: { path: ["student", "id"], equals: subject.id } },
			{ meta: { path: ["studentId"], equals: subject.id } },
		);
	}
	return { OR: or };
}

function effectiveTypes(
	scope: ActivityFeedScope,
	filters: ActivityFeedFilters,
) {
	if (!filters.types?.length) return [...scope.allowedTypes];
	const wanted = new Set(filters.types);
	return scope.allowedTypes.filter((type) => wanted.has(type));
}

export function buildActivityFeedWhere(
	scope: ActivityFeedScope,
	filters: ActivityFeedFilters = {},
): Prisma.ActivityWhereInput {
	const and: Prisma.ActivityWhereInput[] = [];
	const q = filters.q?.trim();
	if (q) {
		and.push({
			OR: [
				{ title: { contains: q, mode: "insensitive" } },
				{ description: { contains: q, mode: "insensitive" } },
				{ author: { contains: q, mode: "insensitive" } },
			],
		});
	}
	if (filters.subject) and.push(subjectWhere(filters.subject));

	const userFilter = scope.viewer.canViewAll
		? filters.userIds?.length
			? { userId: { in: [...filters.userIds] } }
			: {}
		: { userId: scope.viewer.userId };

	return {
		schoolProfileId: scope.schoolId,
		deletedAt: null,
		type: { in: effectiveTypes(scope, filters) as ActivityType[] },
		createdAt: {
			not: null,
			...(filters.from ? { gte: filters.from } : {}),
			...(filters.to ? { lte: filters.to } : {}),
		},
		...userFilter,
		...(and.length ? { AND: and } : {}),
	};
}

const feedOrder = [
	{ createdAt: "desc" },
	{ id: "desc" },
] satisfies Prisma.ActivityOrderByWithRelationInput[];

export async function listActivities(
	db: ActivityReader,
	input: ActivityFeedScope & {
		filters?: ActivityFeedFilters;
		cursor?: string | null;
		limit: number;
	},
) {
	const limit = Math.min(Math.max(Math.trunc(input.limit), 1), 100);
	const where = buildActivityFeedWhere(input, input.filters);
	const cursor = decodeActivityCursor(input.cursor);
	const rows = await db.activity.findMany({
		where: cursor
			? {
					AND: [
						where,
						{
							OR: [
								{ createdAt: { lt: cursor.createdAt } },
								{ createdAt: cursor.createdAt, id: { lt: cursor.id } },
							],
						},
					],
				}
			: where,
		select: activityFeedSelect,
		orderBy: feedOrder,
		take: limit + 1,
	});
	const page = rows.slice(0, limit);
	const last = page.at(-1);
	return {
		rows: page,
		nextCursor: rows.length > limit && last ? encodeActivityCursor(last) : null,
	};
}

export function getActivity(
	db: ActivityReader,
	input: ActivityFeedScope & { id: string },
) {
	return db.activity.findFirst({
		where: { AND: [buildActivityFeedWhere(input), { id: input.id }] },
		select: activityFeedSelect,
	});
}

/**
 * An activity the viewer was notified about (ADR-0093): recipients may open
 * the activity behind their notification even when it is outside their own
 * feed scope. Read policy (allowed types) still applies.
 */
export async function getNotifiedActivity(
	db: ActivityReader & {
		notification: Pick<Database["notification"], "findFirst">;
	},
	input: ActivityFeedScope & { id: string },
) {
	const notice = await db.notification.findFirst({
		where: {
			schoolProfileId: input.schoolId,
			userId: input.viewer.userId,
			deletedAt: null,
			tags: { some: { tagName: "activity_id", tagValue: input.id } },
		},
		select: { id: true },
	});
	if (!notice) return null;
	return db.activity.findFirst({
		where: {
			id: input.id,
			schoolProfileId: input.schoolId,
			deletedAt: null,
			type: { in: [...input.allowedTypes] },
		},
		select: activityFeedSelect,
	});
}

function metaStudentId(meta: unknown) {
	if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
	const record = meta as Record<string, unknown>;
	const student = record.student;
	if (student && typeof student === "object" && !Array.isArray(student)) {
		const id = (student as Record<string, unknown>).id;
		if (typeof id === "string" && id) return id;
	}
	return typeof record.studentId === "string" && record.studentId
		? record.studentId
		: null;
}

/**
 * Other activities about the same entity: the same subject, or — for anything
 * that carries a student snapshot — the same student.
 */
export async function listRelatedActivities(
	db: ActivityReader,
	input: ActivityFeedScope & {
		activity: Pick<
			ActivityFeedRow,
			"id" | "subjectType" | "subjectId" | "meta"
		>;
		limit?: number;
	},
) {
	const subjects: Prisma.ActivityWhereInput[] = [];
	const { activity } = input;
	if (activity.subjectType && activity.subjectId) {
		subjects.push(
			subjectWhere({ type: activity.subjectType, id: activity.subjectId }),
		);
	}
	const studentId = metaStudentId(activity.meta);
	if (
		studentId &&
		!(activity.subjectType === "student" && activity.subjectId === studentId)
	) {
		subjects.push(subjectWhere({ type: "student", id: studentId }));
	}
	if (!subjects.length) return [];
	return db.activity.findMany({
		where: {
			AND: [
				buildActivityFeedWhere(input),
				{ id: { not: activity.id } },
				{ OR: subjects },
			],
		},
		select: activityFeedSelect,
		orderBy: feedOrder,
		take: Math.min(Math.max(input.limit ?? 10, 1), 50),
	});
}

/** Row counts per type for the filter UI (types filter itself is ignored). */
export async function summarizeActivityTypes(
	db: ActivityReader,
	input: ActivityFeedScope & { filters?: Omit<ActivityFeedFilters, "types"> },
) {
	const groups = await db.activity.groupBy({
		by: ["type"],
		where: buildActivityFeedWhere(input, { ...input.filters, types: null }),
		_count: { _all: true },
	});
	return groups.map((group) => ({
		type: group.type as ActivityTypeName,
		count: group._count._all,
	}));
}

/**
 * Users who authored activities in the school (member filter). Callers must
 * only expose this to viewers with `canViewAll`.
 */
export async function listActivityMembers(
	db: ActivityReader,
	input: { schoolId: string; allowedTypes: readonly ActivityTypeName[] },
) {
	const where: Prisma.ActivityWhereInput = {
		schoolProfileId: input.schoolId,
		deletedAt: null,
		type: { in: [...input.allowedTypes] as ActivityType[] },
		userId: { not: "system" },
	};
	const groups = await db.activity.groupBy({
		by: ["userId"],
		where,
		_count: { _all: true },
		_max: { createdAt: true },
	});
	if (!groups.length) return [];
	const ids = groups.map((group) => group.userId);
	const [users, authors] = await Promise.all([
		db.user.findMany({
			where: { id: { in: ids } },
			select: { id: true, name: true, role: true },
		}),
		db.activity.findMany({
			where: { ...where, userId: { in: ids } },
			distinct: ["userId"],
			orderBy: { createdAt: "desc" },
			select: { userId: true, author: true },
		}),
	]);
	const userById = new Map(users.map((user) => [user.id, user]));
	const authorById = new Map(authors.map((row) => [row.userId, row.author]));
	return groups
		.map((group) => {
			const user = userById.get(group.userId);
			return {
				userId: group.userId,
				name:
					user?.name?.trim() || authorById.get(group.userId) || "Unknown user",
				role: user?.role ?? null,
				/** Deleted (or never a school user): name comes from the snapshot. */
				removed: !user,
				count: group._count._all,
				lastActiveAt: group._max.createdAt,
			};
		})
		.sort((a, b) => a.name.localeCompare(b.name));
}
