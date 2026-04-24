import { render } from "@school-clerk/email/render";
import {
	createNotificationFromType,
	type SchoolClerkNotificationType,
} from "@school-clerk/notifications";
import { getRecipient, resolveDashboardAppRootDomain } from "@school-clerk/utils";
import { TRPCError } from "@trpc/server";
import type { TRPCContext } from "../trpc/init";

const NOTIFICATION_ROLE_GROUPS = {
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

function getNotificationEmailFrom() {
	return (
		process.env.RESEND_FROM_EMAIL ??
		"School Clerk Notifications <notifications@school-clerkprodesk.com>"
	);
}

function getDashboardOrigin(subDomain: string) {
	const rootDomain = resolveDashboardAppRootDomain(process.env.APP_ROOT_DOMAIN);
	const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
	return `${protocol}://${subDomain}.${rootDomain}`;
}

async function sendEmail({
	html,
	subject,
	to,
}: {
	html: string;
	subject: string;
	to: string;
}) {
	const apiKey = process.env.RESEND_API_KEY;

	if (!apiKey) {
		console.warn(`[notifications] resend api key missing; email not sent to ${to}`);
		return false;
	}

	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: getNotificationEmailFrom(),
			to: [getRecipient(to)],
			subject,
			html,
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

	const session = await ctx.db.session.findFirst({
		where: {
			id: ctx.profile.authSessionId,
			deletedAt: null,
		},
		select: {
			user: {
				select: {
					email: true,
					id: true,
					name: true,
					role: true,
				},
			},
		},
	});

	const school = await ctx.db.schoolProfile.findFirst({
		where: {
			id: ctx.profile.schoolId,
			deletedAt: null,
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

async function resolveRecipients(
	ctx: TRPCContext,
	input: {
		audience: NotificationAudience;
		school: CurrentUserContext["school"];
	},
) {
	const roles = NOTIFICATION_ROLE_GROUPS[input.audience];

	const users = await ctx.db.user.findMany({
		where: {
			saasAccountId: input.school.accountId,
			role: { in: [...roles] },
			deletedAt: null,
		},
		select: {
			email: true,
			id: true,
			name: true,
			role: true,
		},
		orderBy: { createdAt: "asc" },
	});

	return users;
}

function absolutizeLink(school: CurrentUserContext["school"], link?: string | null) {
	if (!link) return null;
	if (link.startsWith("http://") || link.startsWith("https://")) {
		return link;
	}
	return `${getDashboardOrigin(school.subDomain)}${link}`;
}

export async function dispatchSchoolNotification<
	TType extends SchoolClerkNotificationType,
>(
	ctx: TRPCContext,
	input: {
		audience: NotificationAudience;
		payload: unknown;
		type: TType;
	},
) {
	try {
		const current = await getCurrentUserContext(ctx);
		const recipients = await resolveRecipients(ctx, {
			audience: input.audience,
			school: current.school,
		});

		if (!recipients.length) {
			return { emailSent: 0, inAppCreated: 0, skipped: true };
		}

		const notification = createNotificationFromType(
			input.type,
			input.payload as never,
		);
		const emailPayload =
			input.payload && typeof input.payload === "object"
				? ({
						...(input.payload as Record<string, unknown>),
						link: absolutizeLink(
							current.school,
							(input.payload as { link?: string | null }).link,
						),
					} as never)
				: (input.payload as never);
		const emailNotification = createNotificationFromType(input.type, emailPayload);
		const preferences = await ctx.db.notificationPreference.findMany({
			where: {
				schoolProfileId: current.school.id,
				userId: { in: recipients.map((recipient) => recipient.id) },
				type: notification.type,
				deletedAt: null,
			},
			select: {
				email: true,
				inApp: true,
				userId: true,
			},
		});

		const preferenceMap = new Map(
			preferences.map((preference) => [preference.userId, preference]),
		);

		const inAppRecipients = recipients.filter((recipient) => {
			return preferenceMap.get(recipient.id)?.inApp ?? true;
		});

		if (inAppRecipients.length) {
			await ctx.db.notification.createMany({
				data: inAppRecipients.map((recipient) => ({
					body: notification.body,
					link: notification.link,
					schoolProfileId: current.school.id,
					title: notification.title,
					type: notification.type,
					userId: recipient.id,
				})),
			});
		}

		let emailSent = 0;
		if (notification.channels.includes("email") && emailNotification.emailTemplate) {
			const html = await render(emailNotification.emailTemplate.content);
			const emailRecipients = recipients.filter((recipient) => {
				if (!recipient.email) return false;
				return preferenceMap.get(recipient.id)?.email ?? true;
			});

			for (const recipient of emailRecipients) {
				const sent = await sendEmail({
					html,
					subject: emailNotification.emailTemplate.subject,
					to: recipient.email,
				});

				if (sent) emailSent += 1;
			}
		}

		return {
			emailSent,
			inAppCreated: inAppRecipients.length,
			link: absolutizeLink(current.school, notification.link),
			skipped: false,
		};
	} catch (error) {
		console.error("[notifications] dispatch failed", {
			audience: input.audience,
			error,
			type: input.type,
		});

		return { emailSent: 0, inAppCreated: 0, skipped: true };
	}
}
