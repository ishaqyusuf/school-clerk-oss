import {
	createDeliveredUserNotification,
	getNotificationDeliveryRecipient,
	listNotificationAudienceUserIds,
	type NotificationDeliveryScope,
} from "@school-clerk/db";
import { canReadSchoolNotification } from "@school-clerk/notifications/module-policy";
import { resolveModuleAccess } from "@school-clerk/utils/module-config";
import { render } from "@school-clerk/email/render";
import {
	createNotificationFromType,
	type SchoolClerkNotificationType,
} from "@school-clerk/notifications";
import {
	formatTenantEmailFrom,
	getEmailDeliveryRoutes,
	resolveDashboardAppRootDomain,
} from "@school-clerk/utils";
import { TRPCError } from "@trpc/server";
import type { TRPCContext } from "../trpc/init";
import { findAuthSessionByBearer } from "../trpc/init";

const NOTIFICATION_ROLE_GROUPS = {
	academic_admin: ["Admin"],
	finance: ["Admin", "Accountant"],
	payroll: ["Admin", "Accountant", "HR"],
} as const;

type NotificationAudience = keyof typeof NOTIFICATION_ROLE_GROUPS;

type CurrentUserContext = {
	school: {
		accountId: string;
		id: string;
		name: string;
		subDomain: string;
	};
	user: {
		email: string;
		id: string;
		name: string;
		role: string | null;
	};
};

function getNotificationEmailFrom(schoolName?: string | null) {
	return formatTenantEmailFrom({
		defaultEmail: "notifications@school-clerk.com",
		fallbackFrom: process.env.RESEND_FROM_EMAIL,
		fallbackName: "School Clerk Notifications",
		schoolName,
	});
}

function normalizeHost(value?: string | null) {
	return (
		value
			?.trim()
			.replace(/^https?:\/\//i, "")
			.replace(/\/+$/, "") || ""
	);
}

function stripDashboardHostPrefix(host: string) {
	return host.startsWith("dashboard.") ? host.slice("dashboard.".length) : host;
}

function getSchoolSiteRootDomain() {
	const explicitRoot = normalizeHost(
		process.env.SCHOOL_SITE_ROOT_DOMAIN ?? process.env.APP_ROOT_DOMAIN,
	);

	if (explicitRoot) {
		return stripDashboardHostPrefix(explicitRoot);
	}

	const publicHost = normalizeHost(process.env.NEXT_PUBLIC_APP_URL);
	if (publicHost) {
		return stripDashboardHostPrefix(publicHost);
	}

	return "school-clerk.com";
}

function getDashboardOrigin(subDomain: string) {
	const protocol = process.env.NODE_ENV === "development" ? "http" : "https";

	if (process.env.NODE_ENV === "production") {
		return `${protocol}://dashboard.${subDomain}.${getSchoolSiteRootDomain()}`;
	}

	const rootDomain = resolveDashboardAppRootDomain(process.env.APP_ROOT_DOMAIN);
	return `${protocol}://${subDomain}.${rootDomain}`;
}

async function sendEmail({
	html,
	schoolName,
	subject,
	to,
}: {
	html: string;
	schoolName?: string | null;
	subject: string;
	to: string;
}) {
	const [route] = getEmailDeliveryRoutes(to);
	if (!route) throw new Error("At least one email recipient is required.");
	if (route.transport === "console") {
		console.info("[notifications] email captured by console delivery", {
			recipient: route.originalRecipient,
			subject,
		});
		return true;
	}
	const apiKey = process.env.RESEND_API_KEY;

	if (!apiKey) {
		console.warn(
			`[notifications] resend api key missing; email not sent to ${to}`,
		);
		return false;
	}

	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: getNotificationEmailFrom(schoolName),
			to: [route.recipient],
			subject: route.qaRouted
				? `[QA: ${route.originalRecipient}] ${subject}`
				: subject,
			html: route.qaRouted
				? `<p><strong>QA routed for ${route.originalRecipient}</strong></p>${html}`
				: html,
			headers: route.qaRouted
				? { "X-QA-Original-Recipient": route.originalRecipient }
				: undefined,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		console.error(`[notifications] email send failed: ${errorText}`);
		return false;
	}

	return true;
}

export async function getCurrentUserContext(
	ctx: TRPCContext,
): Promise<CurrentUserContext> {
	if (!ctx.profile.authSessionId || !ctx.profile.schoolId) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Notification context is unavailable.",
		});
	}

	const session = await findAuthSessionByBearer(ctx.db, ctx.profile.authSessionId);
	if (!session?.user.saasAccountId || session.user.tenant?.qaPurgeStartedAt) {
		throw new TRPCError({ code: "UNAUTHORIZED", message: "Notification account context is unavailable." });
	}

	const school = await ctx.db.schoolProfile.findFirst({
		where: {
			id: ctx.profile.schoolId,
			accountId: session.user.saasAccountId,
			deletedAt: null,
			account: { deletedAt: null, qaPurgeStartedAt: null },
		},
		select: {
			accountId: true,
			id: true,
			name: true,
			subDomain: true,
		},
	});

	if (!session?.user || !school) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Notification context could not be resolved.",
		});
	}

	return {
		school,
		user: session.user,
	};
}

export async function tryGetCurrentUserContext(ctx: TRPCContext) {
	try {
		return await getCurrentUserContext(ctx);
	} catch {
		return null;
	}
}
function absolutizeLink(
	school: CurrentUserContext["school"],
	link?: string | null,
) {
	if (!link) return null;
	if (link.startsWith("http://") || link.startsWith("https://")) {
		return link;
	}
	return `${getDashboardOrigin(school.subDomain)}${link}`;
}

type DispatchInput = {
	type: SchoolClerkNotificationType;
	payload: unknown;
} & ({ audience: NotificationAudience; userId?: never } | { userId: string; audience?: never });

function buildNotification(input: DispatchInput, school: CurrentUserContext["school"], email = false) {
	const payload = input.payload && typeof input.payload === "object"
		? { ...(input.payload as Record<string, unknown>), schoolName: school.name,
			...(email ? { link: absolutizeLink(school, (input.payload as { link?: string | null }).link) } : {}) }
		: input.payload;
	return createNotificationFromType(input.type, payload);
}

async function getAllowedRecipient(ctx: TRPCContext, scope: NotificationDeliveryScope) {
	const current = await getNotificationDeliveryRecipient(ctx.db, scope);
	return current && canReadSchoolNotification(scope.type,
		resolveModuleAccess(current.school.moduleConfiguration), current.recipient.role) ? current : null;
}

async function dispatchNotification(ctx: TRPCContext, input: DispatchInput) {
	let emailSent = 0;
	let inAppCreated = 0;
	let failedChannels = 0;
	try {
		const authSessionId = ctx.profile.authSessionId;
		if (!authSessionId) throw new Error("Notification session is unavailable.");
		const current = await getCurrentUserContext(ctx);
		const audienceRoles = input.audience ? NOTIFICATION_ROLE_GROUPS[input.audience] : undefined;
		const recipients = audienceRoles
			? await listNotificationAudienceUserIds(ctx.db, { accountId: current.school.accountId, roles: audienceRoles })
			: input.userId ? [{ id: input.userId }] : [];
		for (const recipient of recipients) {
			const scope: NotificationDeliveryScope = {
				schoolId: current.school.id, accountId: current.school.accountId,
				actorUserId: current.user.id, authSessionId,
				recipientUserId: recipient.id, type: input.type, audienceRoles,
			};
			try {
				const created = await ctx.db.$transaction(async (tx) => {
					const live = await getNotificationDeliveryRecipient(tx, scope);
					if (!live || !canReadSchoolNotification(scope.type,
						resolveModuleAccess(live.school.moduleConfiguration), live.recipient.role) ||
						live.preference?.inApp === false) return false;
					const notification = buildNotification(input, live.school);
					if (!notification.channels.includes("in_app")) return false;
					await createDeliveredUserNotification(tx, live, {
						action: notification.action ?? undefined, body: notification.body,
						link: notification.link, subject: notification.emailTemplate?.subject ?? notification.title,
						title: notification.title, type: notification.type,
					});
					return true;
				});
				if (created) inAppCreated += 1;
			} catch {
				failedChannels += 1;
				console.error("[notifications] in-app delivery failed", { type: input.type, userId: recipient.id });
			}

			try {
				const beforeRender = await getAllowedRecipient(ctx, scope);
				if (!beforeRender || beforeRender.preference?.email === false || !beforeRender.recipient.email) continue;
				const notification = buildNotification(input, beforeRender.school, true);
				if (!notification.channels.includes("email") || !notification.emailTemplate) continue;
				const html = await render(notification.emailTemplate.content);
				const beforeSend = await getAllowedRecipient(ctx, scope);
				if (!beforeSend || beforeSend.preference?.email === false || !beforeSend.recipient.email ||
					beforeSend.school.name !== beforeRender.school.name ||
					beforeSend.school.subDomain !== beforeRender.school.subDomain) continue;
				const sent = await sendEmail({
					html, schoolName: beforeSend.school.name,
					subject: notification.emailTemplate.subject, to: beforeSend.recipient.email,
				});
				if (sent) emailSent += 1;
				else failedChannels += 1;
			} catch {
				failedChannels += 1;
				console.error("[notifications] email delivery failed", { type: input.type, userId: recipient.id });
			}
		}
	} catch {
		failedChannels += 1;
		console.error("[notifications] dispatch context unavailable", { type: input.type });
	}
	return { emailSent, inAppCreated, failedChannels, skipped: emailSent === 0 && inAppCreated === 0 };
}

export function dispatchSchoolNotification<TType extends SchoolClerkNotificationType>(
	ctx: TRPCContext,
	input: { audience: NotificationAudience; payload: unknown; type: TType },
) {
	return dispatchNotification(ctx, input);
}

export function dispatchUserNotification<TType extends SchoolClerkNotificationType>(
	ctx: TRPCContext,
	input: { payload: unknown; type: TType; userId: string },
) {
	return dispatchNotification(ctx, input);
}
