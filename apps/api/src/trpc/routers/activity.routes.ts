import {
	ACTIVITY_NOTIFICATION_ROLES,
	type ActivityFeedRow,
	type ActivityFeedScope,
	ActivityNotificationRuleError,
	getActivity,
	getSchoolModuleConfiguration,
	listActivities,
	listActivityMembers,
	listActivityNotificationCandidates,
	listActivityNotificationRules,
	listRelatedActivities,
	summarizeActivityTypes,
	upsertActivityNotificationRule,
} from "@school-clerk/db";
import {
	ACTIVITY_CATEGORY_LABELS,
	activityActionHref,
	getActivityTypeConfig,
	listActivityTypesByCategory,
	listReadableActivityTypes,
} from "@school-clerk/notifications/activities";
import type { ActivityTypeName } from "@school-clerk/utils/activity";
import { STAFF_ROLES } from "@school-clerk/utils/constants";
import { resolveModuleAccess } from "@school-clerk/utils/module-config";
import { TRPCError } from "@trpc/server";
import { invalidateActivityNotificationRuleCache } from "../../lib/activity-notifications";
import {
	activityByIdSchema,
	activityListSchema,
	activityRangeSchema,
	activityRuleUpdateSchema,
} from "../../schemas/activity";
import {
	type TRPCContext,
	authenticatedProcedure,
	createTRPCRouter,
} from "../init";

/**
 * Activity feed (ADR-0093). Admins see every member's activity; everyone else
 * sees only their own. Types are always limited to the viewer's module/role
 * read policy from the activity registry.
 */
async function getActivityViewer(ctx: TRPCContext) {
	const user = ctx.currentUser;
	const schoolId = ctx.profile.schoolId;
	if (!user || !schoolId) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "A signed-in school context is required.",
		});
	}
	if (!user.saasAccountId) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "School account membership is required.",
		});
	}
	const school = await getSchoolModuleConfiguration(ctx.db, {
		schoolId,
		accountId: user.saasAccountId,
	});
	if (!school) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "The selected school is unavailable in this account.",
		});
	}
	const access = resolveModuleAccess(school.moduleConfiguration);
	const isAdmin = user.role?.trim().toLowerCase() === "admin";
	const allowedTypes = listReadableActivityTypes(access, user.role);
	const scope: ActivityFeedScope = {
		schoolId,
		viewer: { userId: user.id, canViewAll: isAdmin },
		allowedTypes,
	};
	return {
		scope,
		access,
		isAdmin,
		accountId: user.saasAccountId,
		userId: user.id,
	};
}

async function requireActivityAdmin(ctx: TRPCContext) {
	const viewer = await getActivityViewer(ctx);
	if (!viewer.isAdmin) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only school admins can manage activity notifications.",
		});
	}
	return viewer;
}

function toActivityItem(row: ActivityFeedRow) {
	const config = getActivityTypeConfig(row.type);
	if (!config) return null;
	const action = config.action(row.meta);
	return {
		id: row.id,
		type: config.type,
		label: config.label,
		category: config.category,
		tone: config.tone,
		icon: config.icon,
		source: row.source,
		createdAt: row.createdAt,
		title: row.title,
		description: row.description,
		actor: {
			userId: row.userId === "system" ? null : row.userId,
			name: row.author,
		},
		parts: config.describe(row.meta, row),
		subject:
			row.subjectType && row.subjectId
				? { type: row.subjectType, id: row.subjectId }
				: null,
		action,
		href: activityActionHref(action),
	};
}

export type ActivityItem = NonNullable<ReturnType<typeof toActivityItem>>;

function toActivityItems(rows: ActivityFeedRow[]) {
	return rows
		.map(toActivityItem)
		.filter((item): item is ActivityItem => item !== null);
}

/** Notifiable types this school can read at all (role-agnostic for admins). */
function configurableTypes(
	viewer: Awaited<ReturnType<typeof getActivityViewer>>,
) {
	return listReadableActivityTypes(viewer.access, "admin").filter(
		(type) => getActivityTypeConfig(type)?.notifiable,
	);
}

const ruleRouter = createTRPCRouter({
	list: authenticatedProcedure.query(async ({ ctx }) => {
		const viewer = await requireActivityAdmin(ctx);
		const types = configurableTypes(viewer);
		const rules = new Map(
			(
				await listActivityNotificationRules(ctx.db, {
					schoolId: viewer.scope.schoolId,
					types,
				})
			).map((rule) => [rule.type, rule]),
		);
		return {
			categories: listActivityTypesByCategory(types).map((group) => ({
				category: group.category,
				label: group.label,
				rules: group.types.flatMap((config) => {
					const rule = rules.get(config.type);
					return rule
						? [
								{
									...rule,
									label: config.label,
									icon: config.icon,
									tone: config.tone,
									category: config.category,
								},
							]
						: [];
				}),
			})),
		};
	}),

	update: authenticatedProcedure
		.input(activityRuleUpdateSchema)
		.mutation(async ({ ctx, input }) => {
			const viewer = await requireActivityAdmin(ctx);
			if (!configurableTypes(viewer).includes(input.type)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This activity type cannot send notifications.",
				});
			}
			try {
				const rule = await upsertActivityNotificationRule(ctx.db, {
					schoolId: viewer.scope.schoolId,
					accountId: viewer.accountId,
					type: input.type,
					enabled: input.enabled,
					inApp: input.inApp,
					email: input.email,
					roles: input.roles,
					userIds: input.userIds,
					updatedByUserId: viewer.userId,
				});
				invalidateActivityNotificationRuleCache(viewer.scope.schoolId);
				return rule;
			} catch (error) {
				if (error instanceof ActivityNotificationRuleError) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: error.message,
						cause: error,
					});
				}
				throw error;
			}
		}),

	options: authenticatedProcedure.query(async ({ ctx }) => {
		const viewer = await requireActivityAdmin(ctx);
		const members = await listActivityNotificationCandidates(ctx.db, {
			accountId: viewer.accountId,
		});
		return {
			roles: STAFF_ROLES.map((role) => ({
				value: role.toLowerCase(),
				label: role,
			})).filter((role) => ACTIVITY_NOTIFICATION_ROLES.includes(role.value)),
			members: members.map((member) => ({
				userId: member.id,
				name: member.name,
				email: member.email,
				role: member.role,
			})),
		};
	}),
});

export const activityRouter = createTRPCRouter({
	list: authenticatedProcedure
		.input(activityListSchema)
		.query(async ({ ctx, input }) => {
			const { scope, userId } = await getActivityViewer(ctx);
			const { cursor, limit, subject, scope: feedScope, ...filters } = input;
			const page = await listActivities(ctx.db, {
				...scope,
				filters: {
					...filters,
					userIds: feedScope === "mine" ? [userId] : filters.userIds,
					// Explicit so consumers compiled without strictNullChecks agree.
					subject:
						subject?.type && subject.id
							? { type: subject.type, id: subject.id }
							: null,
				},
				cursor,
				limit,
			});
			return { items: toActivityItems(page.rows), nextCursor: page.nextCursor };
		}),

	byId: authenticatedProcedure
		.input(activityByIdSchema)
		.query(async ({ ctx, input }) => {
			const { scope } = await getActivityViewer(ctx);
			const row = await getActivity(ctx.db, { ...scope, id: input.id });
			const item = row ? toActivityItem(row) : null;
			if (!row || !item)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Activity not found.",
				});
			const config = getActivityTypeConfig(row.type);
			const related = await listRelatedActivities(ctx.db, {
				...scope,
				activity: row,
				limit: input.relatedLimit,
			});
			return {
				item,
				details: config?.details(row.meta) ?? [],
				related: toActivityItems(related),
			};
		}),

	filters: authenticatedProcedure
		.input(activityRangeSchema.optional())
		.query(async ({ ctx, input }) => {
			const viewer = await getActivityViewer(ctx);
			const [counts, members] = await Promise.all([
				summarizeActivityTypes(ctx.db, {
					...viewer.scope,
					filters: {
						from: input?.from,
						to: input?.to,
						userIds: input?.scope === "mine" ? [viewer.userId] : null,
					},
				}),
				viewer.isAdmin
					? listActivityMembers(ctx.db, {
							schoolId: viewer.scope.schoolId,
							allowedTypes: viewer.scope.allowedTypes,
						})
					: Promise.resolve(null),
			]);
			const countByType = new Map<ActivityTypeName, number>(
				counts.map((entry) => [entry.type, entry.count]),
			);
			return {
				canViewAll: viewer.isAdmin,
				categories: listActivityTypesByCategory(viewer.scope.allowedTypes).map(
					(group) => ({
						category: group.category,
						label: group.label ?? ACTIVITY_CATEGORY_LABELS[group.category],
						count: group.types.reduce(
							(total, config) => total + (countByType.get(config.type) ?? 0),
							0,
						),
						types: group.types.map((config) => ({
							type: config.type,
							label: config.label,
							icon: config.icon,
							tone: config.tone,
							count: countByType.get(config.type) ?? 0,
						})),
					}),
				),
				members,
			};
		}),

	rules: ruleRouter,
});
