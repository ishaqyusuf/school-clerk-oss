import type {
	ActivityMeta,
	ActivitySubject,
	ActivityTypeName,
} from "@school-clerk/utils/activity";
import type { Prisma } from "./generated/client";
import type { Database, DatabaseTransaction } from "./prisma";

type ActivityWriter = Pick<Database, "activity"> | Pick<DatabaseTransaction, "activity">;

export type RecordActivityInput<T extends ActivityTypeName> = {
	schoolId: string;
	type: T;
	/** Acting user id; use "system" for jobs without a user. */
	userId: string;
	/** Actor display name snapshot. */
	author: string;
	source?: "user" | "system";
	/** Short plain-text title (fallback / search). */
	title: string;
	/** Plain-text sentence (fallback / search / email). */
	description?: string | null;
	meta: ActivityMeta<T>;
	subject?: ActivitySubject | null;
};

/**
 * Persist one activity row. Pass the transaction client when the domain write
 * is transactional so the activity commits (or rolls back) with it.
 *
 * Notification fan-out happens post-commit in the API layer (ADR-0093); this
 * function never notifies.
 */
export async function recordActivity<T extends ActivityTypeName>(
	db: ActivityWriter,
	input: RecordActivityInput<T>,
) {
	return db.activity.create({
		data: {
			schoolProfileId: input.schoolId,
			type: input.type,
			userId: input.userId,
			author: input.author,
			source: input.source ?? "user",
			title: input.title,
			description: input.description ?? null,
			meta: input.meta as unknown as Prisma.InputJsonValue,
			subjectType: input.subject?.type ?? null,
			subjectId: input.subject?.id ?? null,
		},
		select: { id: true },
	});
}

/**
 * Best-effort variant for non-transactional call sites: a logging failure must
 * never fail the user's action.
 */
export async function recordActivitySafely<T extends ActivityTypeName>(
	db: ActivityWriter,
	input: RecordActivityInput<T>,
) {
	try {
		return await recordActivity(db, input);
	} catch (error) {
		console.error(`[activity] failed to record ${input.type}`, error);
		return null;
	}
}

/** Display name for an actor user id, with a stable fallback. */
export async function activityActorName(
	db: Pick<Database, "user"> | Pick<DatabaseTransaction, "user">,
	userId: string | null | undefined,
	fallback = "School Clerk",
) {
	if (!userId) return fallback;
	const user = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
	return user?.name?.trim() || fallback;
}
