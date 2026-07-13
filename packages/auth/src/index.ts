import { prisma } from "@school-clerk/db";
import {
	formatTenantEmailFrom,
	getRecipient,
	resolveDashboardAppRootDomain,
} from "@school-clerk/utils";
import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
// import { expo } from "@better-auth/expo";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { nextCookies } from "better-auth/next-js";
import * as z from "zod";

async function sendAuthEmail({
	schoolName,
	to,
	subject,
	html,
}: {
	schoolName?: string | null;
	to: string;
	subject: string;
	html: string;
}) {
	const apiKey = process.env.RESEND_API_KEY;
	const from = formatTenantEmailFrom({
		fallbackFrom: process.env.RESEND_FROM_EMAIL,
		schoolName,
	});

	if (!apiKey) {
		console.warn(`[auth] resend api key missing; email not sent to ${to}`);
		return;
	}

	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from,
			to: [getRecipient(to)],
			subject,
			html,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to send auth email: ${errorText}`);
	}
}

function escapeHtml(value: string) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function getHeaderValue(request: Request | undefined, name: string) {
	const value = request?.headers.get(name)?.trim();
	if (!value) return null;

	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

function getTokenFromResetUrl(url: URL) {
	const pathToken = url.pathname.split("/").filter(Boolean).at(-1);

	if (pathToken && pathToken !== "reset-password") {
		return pathToken;
	}

	return url.searchParams.get("token");
}

function buildPasswordResetEmailUrl(url: string, email?: string | null) {
	try {
		const resetUrl = new URL(url);
		const callbackUrl =
			resetUrl.searchParams.get("callbackURL") ??
			resetUrl.searchParams.get("callbackUrl") ??
			resetUrl.searchParams.get("redirectTo");
		const token = getTokenFromResetUrl(resetUrl);

		if (!callbackUrl || !token) return url;

		const emailUrl = new URL(callbackUrl);
		emailUrl.searchParams.set("token", token);
		if (email) {
			emailUrl.searchParams.set("email", email);
		}

		return emailUrl.toString();
	} catch {
		return url;
	}
}

function renderPasswordResetEmail({
	name,
	role,
	schoolName,
	url,
}: {
	name: string;
	role?: string | null;
	schoolName?: string | null;
	url: string;
}) {
	const accountName = schoolName || "School Clerk";
	const escapedAccountName = escapeHtml(accountName);
	const escapedName = escapeHtml(name || "there");
	const escapedRole = role ? escapeHtml(role) : null;
	const escapedUrl = escapeHtml(url);

	return `
		<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
			<h2 style="margin-bottom: 12px;">Set or reset your ${escapedAccountName} password</h2>
			<p>Hello ${escapedName},</p>
			<p>
				${
					escapedRole
						? `You've been invited to join ${escapedAccountName} as a ${escapedRole}.`
						: `Use the link below to continue with your ${escapedAccountName} account.`
				}
			</p>
      <p>
        <a
          href="${escapedUrl}"
          style="display:inline-block;padding:12px 20px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;"
        >
          Set password
        </a>
      </p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p><a href="${escapedUrl}">${escapedUrl}</a></p>
			<p>This link lets you choose a password and continue to the dashboard.</p>
		</div>
	`;
}

const devQuickLoginBodySchema = z.object({
	userId: z.string().min(1),
	rememberMe: z.boolean().optional(),
});

function devQuickLoginPlugin() {
	return {
		id: "school-clerk-dev-quick-login",
		endpoints: {
			devQuickLogin: createAuthEndpoint(
				"/school-clerk/dev-quick-login",
				{
					method: "POST",
					body: devQuickLoginBodySchema,
				},
				async (ctx) => {
					if (process.env.NODE_ENV === "production") {
						throw new APIError("FORBIDDEN", {
							message: "Dev quick login is not available in production.",
						});
					}

					const user = await ctx.context.internalAdapter.findUserById(
						ctx.body.userId,
					);

					if (!user) {
						throw new APIError("NOT_FOUND", {
							message: "Quick login user was not found.",
						});
					}

					const dontRememberMe = ctx.body.rememberMe === false;
					const session = await ctx.context.internalAdapter.createSession(
						user.id,
						dontRememberMe,
					);

					if (!session) {
						throw new APIError("UNAUTHORIZED", {
							message: "Failed to create quick login session.",
						});
					}

					await setSessionCookie(
						ctx,
						{
							session,
							user,
						},
						dontRememberMe,
					);

					return ctx.json({
						token: session.token,
						user,
					});
				},
			),
		},
	} satisfies BetterAuthPlugin;
}

export function initAuth(options: {
	baseUrl: string;
	productionUrl: string;
	secret: string;
	//   discordClientId: string;
	//   discordClientSecret: string;
}) {
	const developmentAppRootDomain = resolveDashboardAppRootDomain(
		process.env.APP_ROOT_DOMAIN,
	);
	const defaultDevelopmentOrigin = `http://${developmentAppRootDomain}`;

	const config = {
		database: prismaAdapter(prisma, {
			provider: "postgresql",
		}),
		baseURL: options.baseUrl,
		secret: options.secret,
		// secret,//: process.env.BETTER_AUTH_SECRET!,
		account: {
			fields: {
				// providerId
				// accountId: ""
			},
		},
		user: {
			//   fields: {},
			// fields: {
			//   email: true,
			//   createdAt: true,
			//   name: true,
			//   updatedAt: true,
			// },
			additionalFields: {
				role: {
					defaultValue: "Admin",
					required: false,
					type: "string",
				},
				// type: {
				//   type: "string",
				//   required: true,
				// },
			},
		},
		session: {
			expiresIn: 60 * 60 * 24 * 30,
			updateAge: 60 * 60 * 24,
			cookieCache: {
				enabled: true,
				maxAge: 60 * 5,
				strategy: "jwe",
			},
		},
		advanced: {
			// cookies:
		},
		emailAndPassword: {
			enabled: true,
			password: {
				// async hash(password) {
				//   return await hash(password, 10);
				// },
				// async verify(data) {
				//   console.log({ data });
				//   return true;
				// },
				// async verify(data) {
				//   return true;
				// },
			},
			async sendResetPassword(data, request) {
				const schoolName = getHeaderValue(
					request,
					"x-school-clerk-school-name",
				);
				const emailUrl = buildPasswordResetEmailUrl(data.url, data.user.email);
				const subject = `Set or reset your ${schoolName || "School Clerk"} password`;

				await sendAuthEmail({
					to: data.user.email,
					schoolName,
					subject,
					html: renderPasswordResetEmail({
						name: data.user.name,
						schoolName,
						url: emailUrl,
					}),
				});
			},
		},
		plugins: [
			nextCookies(),
			devQuickLoginPlugin(),
			//   username({}),
			//   oAuthProxy({
			//     /**
			//      * Auto-inference blocked by https://github.com/better-auth/better-auth/pull/2891
			//      */
			//     currentURL: options.baseUrl,
			//     productionURL: options.productionUrl,
			//   }),
			//   expo(),
		],
		socialProviders: {
			//   discord: {
			//     clientId: options.discordClientId,
			//     clientSecret: options.discordClientSecret,
			//     redirectURI: `${options.productionUrl}/api/auth/callback/discord`,
			//   },
			// google: {}
		},
		hooks: {},
		trustedOrigins: (request) => {
			const requestOrigin = request?.headers?.get("origin");
			const requestUrlOrigin = request?.url
				? new URL(request?.url).origin
				: null;

			return [
				"expo://",
				defaultDevelopmentOrigin,
				options.baseUrl,
				options.productionUrl,
				requestUrlOrigin,
				...(requestOrigin ? [requestOrigin] : []),
				"https://01f5e232bbc3.ngrok-free.app",
			];
		},
	} satisfies BetterAuthOptions;

	return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
