import {
	type ActivityFeedRow,
	type NotificationDeliveryScope,
	type Prisma,
	activityFeedSelect,
	createDeliveredUserNotification,
	getNotificationDeliveryRecipient,
	listEnabledActivityNotificationRules,
	resolveActivityNotificationRecipients,
} from "@school-clerk/db";
import { render } from "@school-clerk/email/render";
import {
	activityPartsToText,
	getActivityTypeConfig,
} from "@school-clerk/notifications/activities";
import { createActivityNotificationEmail } from "@school-clerk/notifications/activity-email";
import { canReadSchoolNotification } from "@school-clerk/notifications/module-policy";
import {
	type ActivityNotificationAction,
	type ActivityTypeName,
	activityNotificationType,
	isActivityType,
} from "@school-clerk/utils/activity";
import { resolveModuleAccess } from "@school-clerk/utils/module-config";
import { LRUCache } from "lru-cache";
import type { TRPCContext } from "../trpc/init";
import { absolutizeLink, sendEmail } from "./notifications";

/**
 * Post-commit activity notification fan-out (ADR-0093).
 *
 * The mutation middleware calls `dispatchPendingActivityNotifications` after a
 * successful mutation. It claims the current user's un-notified activities
 * created during the request with a conditional update (so concurrent
 * requests never double-send) and delivers each one whose type has an
 * enabled rule. Everything here is best-effort and never throws.
 */

type EnabledRule = Awaited<
	ReturnType<typeof listEnabledActivityNotificationRules>
>[number];

/** Timestamps are second precision (rounded), and app/db clocks may differ. */
const CLAIM_SKEW_MS = 2_000;
const MAX_CLAIMS_PER_REQUEST = 50;

// Per-instance cache: most schools have no enabled rules, so the common path
// costs no query. Rule edits on this instance invalidate immediately; other
// instances converge within the TTL.
const enabledRuleCache = new LRUCache<string, EnabledRule[]>({
	max: 2_000,
	ttl: 30_000,
});

export function invalidateActivityNotificationRuleCache(schoolId: string) {
	enabledRuleCache.delete(schoolId);
}

async function getEnabledRules(ctx: TRPCContext, schoolId: string) {
	const cached = enabledRuleCache.get(schoolId);
	if (cached) return cached;
	const rules = await listEnabledActivityNotificationRules(ctx.db, {
		schoolId,
	});
	enabledRuleCache.set(schoolId, rules);
	return rules;
}

type DeliveryContext = {
	ctx: TRPCContext;
	schoolId: string;
	accountId: string;
	actorUserId: string;
	authSessionId: string;
};

export async function dispatchPendingActivityNotifications(
	ctx: TRPCContext,
	input: { since: Date },
) {
	try {
		const actor = ctx.currentUser;
		const schoolId = ctx.profile.schoolId;
		const authSessionId = ctx.profile.authSessionId;
		if (!actor?.saasAccountId || !schoolId || !authSessionId) return;

		const rules = await getEnabledRules(ctx, schoolId);
		if (!rules.length) return;
		const ruleByType = new Map(
			rules
				.filter((rule) => rule.inApp || rule.email)
				.map((rule) => [rule.type, rule]),
		);
		if (!ruleByType.size) return;

		const candidates = await ctx.db.activity.findMany({
			where: {
				schoolProfileId: schoolId,
				userId: actor.id,
				notifiedAt: null,
				deletedAt: null,
				type: { in: [...ruleByType.keys()] },
				createdAt: { gte: new Date(input.since.getTime() - CLAIM_SKEW_MS) },
			},
			select: activityFeedSelect,
			orderBy: [{ createdAt: "asc" }, { id: "asc" }],
			take: MAX_CLAIMS_PER_REQUEST,
		});

		const delivery: DeliveryContext = {
			ctx,
			schoolId,
			accountId: actor.saasAccountId,
			actorUserId: actor.id,
			authSessionId,
		};
		for (const activity of candidates) {
			const rule = ruleByType.get(activity.type);
			if (!rule) continue;
			const claim = await ctx.db.activity.updateMany({
				where: { id: activity.id, notifiedAt: null },
				data: { notifiedAt: new Date() },
			});
			if (claim.count !== 1) continue;
			await deliverActivity(delivery, activity, rule);
		}
	} catch (error) {
		console.error("[activity-notifications] fan-out failed", {
			schoolId: ctx.profile.schoolId,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

async function deliverActivity(
	delivery: DeliveryContext,
	activity: ActivityFeedRow,
	rule: EnabledRule,
) {
	if (!isActivityType(activity.type)) return;
	const config = getActivityTypeConfig(activity.type);
	if (!config?.notifiable) return;
	const activityType: ActivityTypeName = activity.type;
	const type = activityNotificationType(activityType);
	const parts = config.describe(activity.meta, activity);
	const details = config.details(activity.meta);
	const target = config.action(activity.meta);
	// Always open the activity sheet: recipients can read the activity that
	// notified them, while the target route may be outside their role.
	const link = `/activity?activityId=${encodeURIComponent(activity.id)}`;
	const action: ActivityNotificationAction = {
		kind: "activity",
		activityId: activity.id,
		type: activityType,
		target,
		parts,
		category: config.category,
		icon: config.icon,
		actor: {
			userId: activity.userId === "system" ? null : activity.userId,
			name: activity.author,
		},
	};
	const body = activityPartsToText(parts);

	const recipients = await resolveActivityNotificationRecipients(
		delivery.ctx.db,
		{
			accountId: delivery.accountId,
			roles: rule.roles,
			userIds: rule.userIds,
			actorUserId: delivery.actorUserId,
		},
	);

	for (const recipient of recipients) {
		const scope: NotificationDeliveryScope = {
			schoolId: delivery.schoolId,
			accountId: delivery.accountId,
			actorUserId: delivery.actorUserId,
			authSessionId: delivery.authSessionId,
			recipientUserId: recipient.id,
			type,
		};

		if (rule.inApp) {
			try {
				await delivery.ctx.db.$transaction(async (tx) => {
					const live = await getNotificationDeliveryRecipient(tx, scope);
					if (!live || live.preference?.inApp === false || !canRead(type, live))
						return;
					await createDeliveredUserNotification(tx, live, {
						action: action as unknown as Prisma.InputJsonValue,
						body,
						link,
						subject: config.label,
						title: config.label,
						type,
						tags: [
							{ tagName: "activity_id", tagValue: activity.id },
							{ tagName: "activity_type", tagValue: activityType },
						],
					});
				});
			} catch {
				console.error("[activity-notifications] in-app delivery failed", {
					type,
					userId: recipient.id,
				});
			}
		}

		if (rule.email) {
			try {
				const beforeRender = await getNotificationDeliveryRecipient(
					delivery.ctx.db,
					scope,
				);
				if (
					!beforeRender ||
					beforeRender.preference?.email === false ||
					!beforeRender.recipient.email
				)
					continue;
				if (!canRead(type, beforeRender)) continue;
				const template = createActivityNotificationEmail({
					config,
					parts,
					details,
					schoolName: beforeRender.school.name,
					link: absolutizeLink(beforeRender.school, link),
					recipientName: beforeRender.recipient.name,
				});
				const html = await render(template.content);
				const beforeSend = await getNotificationDeliveryRecipient(
					delivery.ctx.db,
					scope,
				);
				if (
					!beforeSend ||
					beforeSend.preference?.email === false ||
					!beforeSend.recipient.email ||
					!canRead(type, beforeSend) ||
					beforeSend.school.name !== beforeRender.school.name ||
					beforeSend.school.subDomain !== beforeRender.school.subDomain
				) {
					continue;
				}
				await sendEmail({
					html,
					schoolName: beforeSend.school.name,
					subject: template.subject,
					to: beforeSend.recipient.email,
				});
			} catch {
				console.error("[activity-notifications] email delivery failed", {
					type,
					userId: recipient.id,
				});
			}
		}
	}
}

function canRead(
	type: string,
	live: NonNullable<
		Awaited<ReturnType<typeof getNotificationDeliveryRecipient>>
	>,
) {
	return canReadSchoolNotification(
		type,
		resolveModuleAccess(live.school.moduleConfiguration),
		live.recipient.role,
	);
}
