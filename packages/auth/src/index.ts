import { prisma } from "@school-clerk/db";
import { resolveDashboardAppRootDomain } from "@school-clerk/utils";
import type { BetterAuthOptions } from "better-auth";
// import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

async function sendAuthEmail({
	to,
	subject,
	html,
}: {
	to: string;
	subject: string;
	html: string;
}) {
	const apiKey = process.env.RESEND_API_KEY;
	const from =
		process.env.RESEND_FROM_EMAIL ??
		"School Clerk <noreply@school-clerkprodesk.com>";

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
			to: [to],
			subject,
			html,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to send auth email: ${errorText}`);
	}
}

function renderPasswordResetEmail({
	name,
	role,
	url,
}: {
	name: string;
	role?: string | null;
	url: string;
}) {
	return `
		<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
			<h2 style="margin-bottom: 12px;">Set or reset your School Clerk password</h2>
			<p>Hello ${name || "there"},</p>
			<p>
				${role ? `You've been invited to join School Clerk as a ${role}.` : "Use the link below to continue with your School Clerk account."}
			</p>
      <p>
        <a
          href="${url}"
          style="display:inline-block;padding:12px 20px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;"
        >
          Set password
        </a>
      </p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p><a href="${url}">${url}</a></p>
			<p>This link lets you choose a password and continue to the dashboard.</p>
		</div>
	`;
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
			async sendResetPassword(data, _request) {
				await sendAuthEmail({
					to: data.user.email,
					subject: "Set or reset your School Clerk password",
					html: renderPasswordResetEmail({
						name: data.user.name,
						url: data.url,
					}),
				});
			},
		},
		plugins: [
			nextCookies(),
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
