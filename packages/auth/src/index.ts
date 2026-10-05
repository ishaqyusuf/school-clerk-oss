import { bindPasswordRecoveryToken, getDevelopmentLoginUser, getPasswordRecoveryIdentity, getPasswordRecoveryToken, prisma } from "@school-clerk/db";
import { PasswordResetEmail, render } from "@school-clerk/email";
import {
	formatTenantEmailFrom,
	formatTenantEmailSubject,
	getEmailDeliveryRoutes,
} from "@school-clerk/utils";
import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
// import { expo } from "@better-auth/expo";
import { APIError, createAuthEndpoint, createAuthMiddleware } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { nextCookies } from "better-auth/next-js";
import * as z from "zod";
import { completePasswordRecovery } from "./password-recovery";
import { isDevelopmentQuickLoginEnabled, isLoopbackRequestHost } from "./development";
import { createAuthOriginPolicy } from "./trusted-origins";
import { loadPasswordSignInIdentity, withLiveAuthSessions, withPasswordSignInIdentity } from "./access";

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
	const [route] = getEmailDeliveryRoutes(to);
	if (!route) throw new Error("At least one email recipient is required.");
	if (route.transport === "console") {
		console.info("[auth] email captured by console delivery", {
			recipient: route.originalRecipient,
			subject,
		});
		return;
	}
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
		throw new Error(`Failed to send auth email: ${errorText}`);
	}
}


const devQuickLoginBodySchema = z.object({
	userId: z.string().min(1).max(200),
	schoolId: z.string().min(1).max(200),
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
					if (!isDevelopmentQuickLoginEnabled() ||
						!isLoopbackRequestHost(ctx.headers?.get("host") ?? ctx.request?.headers.get("host"))) {
						throw new APIError("FORBIDDEN", {
							message: "Quick login is unavailable.",
						});
					}

					const eligible = await getDevelopmentLoginUser(prisma, ctx.body);
					if (!eligible) throw new APIError("FORBIDDEN", { message: "Quick login is unavailable." });
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

					try {
						const current = await getDevelopmentLoginUser(prisma, ctx.body);
						if (!isDevelopmentQuickLoginEnabled() ||
							!isLoopbackRequestHost(ctx.headers?.get("host") ?? ctx.request?.headers.get("host")) ||
							!current || current.email !== eligible.email ||
							current.role !== eligible.role || current.name !== eligible.name || user.email !== current.email ||
							user.name !== current.name || !("role" in user) || user.role !== current.role) {
							throw new Error("Quick login eligibility changed.");
						}
					} catch {
						await ctx.context.internalAdapter.deleteSession(session.token);
						throw new APIError("FORBIDDEN", { message: "Quick login is unavailable." });
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
	const originPolicy = createAuthOriginPolicy(options);

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
					input: false,
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
			expiresIn: 60 * 60 * 24 * 365,
			updateAge: 60 * 60 * 24,
			cookieCache: {
				enabled: false,
				maxAge: 60 * 5,
				strategy: "jwe",
			},
		},
		advanced: {
			// cookies:
		},
		emailAndPassword: {
			enabled: true,
			disableSignUp: true,
			minPasswordLength: 8,
			maxPasswordLength: 128,
			revokeSessionsOnPasswordReset: true,
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
			async sendResetPassword(data) {
				const identity = await prisma.$transaction((tx) => bindPasswordRecoveryToken(tx, {
					userId: data.user.id, email: data.user.email, token: data.token,
				}), { isolationLevel: "Serializable" });
				if (!identity || identity.user.id !== data.user.id) return;
				const schoolName = identity.user.tenant?.schools[0]?.name ?? null;
				const emailUrl = new URL("/reset-password", options.baseUrl);
				emailUrl.searchParams.set("token", data.token);
				emailUrl.searchParams.set("email", identity.user.email);
				const subject = formatTenantEmailSubject({
					message: "set or reset your password",
					schoolName,
				});
				const html = await render(
					PasswordResetEmail({
						name: identity.user.name,
						schoolName,
						url: emailUrl.toString(),
					}),
				);

				const current = await getPasswordRecoveryToken(prisma, data.token);
				if (!current || current.user.id !== identity.user.id || current.user.email !== identity.user.email ||
					current.user.name !== identity.user.name || current.user.tenant?.schools[0]?.name !== identity.user.tenant?.schools[0]?.name) return;
				await sendAuthEmail({
					to: data.user.email,
					schoolName,
					subject,
					html,
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
		hooks: {
			before: createAuthMiddleware(async (ctx) => {
				ctx.context.internalAdapter = withLiveAuthSessions(ctx.context.internalAdapter);
				const origin = ctx.headers?.get("origin") ?? ctx.request?.headers.get("origin");
				if (origin !== null && origin !== undefined && !await originPolicy.isTrusted(origin)) {
					throw new APIError("FORBIDDEN", { message: "Untrusted authentication origin.", code: "INVALID_ORIGIN" });
				}
				if (!origin && ctx.request && !["GET", "HEAD", "OPTIONS"].includes(ctx.request.method) && ctx.request.headers.has("cookie")) {
					let source: URL | null = null;
					try { source = new URL(ctx.request.headers.get("referer") ?? ""); } catch { /* Missing source is denied below. */ }
					if (!source || !await originPolicy.isTrusted(source.origin)) {
						throw new APIError("FORBIDDEN", { message: "Authentication origin is required.", code: "INVALID_ORIGIN" });
					}
				}
				if (ctx.path === "/sign-in/email") {
					const parsed = z.object({ email: z.string().trim().toLowerCase().email().max(320),
						password: z.string().min(1).max(128) }).safeParse(ctx.body);
					const identity = parsed.success ? await loadPasswordSignInIdentity(parsed.data.email) : null;
					if (!identity) {
						if (parsed.success) await ctx.context.password.hash(parsed.data.password);
						throw new APIError("UNAUTHORIZED", { message: "Invalid email or password.", code: "INVALID_EMAIL_OR_PASSWORD" });
					}
					ctx.context.internalAdapter = withPasswordSignInIdentity(ctx.context.internalAdapter, identity);
					return { context: { body: { ...ctx.body, email: identity.user.email } } };
				}
				if (ctx.path === "/request-password-reset") {
					const parsed = z.string().trim().toLowerCase().email().max(320).safeParse(ctx.body?.email);
					if (!parsed.success || !await getPasswordRecoveryIdentity(prisma, parsed.data)) {
						return ctx.json({ status: true, message: "If this email exists in our system, check your email for the reset link" });
					}
					return { context: { body: { ...ctx.body, email: parsed.data } } };
				}
				if (ctx.path === "/reset-password") {
					const token = ctx.body?.token || ctx.query?.token;
					try {
						return ctx.json(await completePasswordRecovery({ token, newPassword: ctx.body?.newPassword }));
					} catch {
						throw new APIError("BAD_REQUEST", { message: "Invalid or unavailable reset token.", code: "INVALID_TOKEN" });
					}
				}
			}),
		},
		trustedOrigins: originPolicy.trustedOrigins,
	} satisfies BetterAuthOptions;

	return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
