import "server-only";

import { auth } from "@/auth/server";
import { getFirstPermittedHref } from "@/components/sidebar/links";
import {
	createDashboardRoutingHeaders,
	getDashboardRoutingContext,
	resolveDashboardRootRouting,
} from "@/utils/dashboard-routing";
import {
	type TenantDomainContext,
	findTenantDomainByCustomDomain,
	findTenantDomainBySubdomain,
} from "@/utils/tenant-domain-context";
import { getDashboardTenantUrlConfig } from "@/utils/tenant-url-config";
import {
	type AuthCookie,
	parseWorkspaceCookie,
	workspaceCookieOptions,
	workspaceCookieSelection,
} from "@/utils/workspace-cookie";
import { prisma, resolveTenantWorkspace } from "@school-clerk/db";
import { isPublicAssessmentRecordingPath } from "./public-share-paths";
import {
	buildTenantRedirectUrl,
	getTenantUrlHeaderNames,
	toInternalTenantPath,
} from "@school-clerk/tenant-url";
import {
	measurePerformance,
	withPerformanceContext,
} from "@school-clerk/utils/server-performance";
import { type NextRequest, NextResponse } from "next/server";

export async function resolveTenantRouting(
	req: NextRequest,
	requestId: string,
) {
	const url = req.nextUrl;
	const tenantUrlConfig = getDashboardTenantUrlConfig();
	const tenantHeaderNames = getTenantUrlHeaderNames(tenantUrlConfig);
	const tenantUrlDevMode = tenantUrlConfig.enablePathStyleHosts !== false;
	const tenantUrlContext = getDashboardRoutingContext(req, tenantUrlConfig);
	const rootResponse = resolveDashboardRootRouting(
		req,
		requestId,
		tenantUrlContext,
		tenantUrlConfig,
	);
	if (rootResponse) return rootResponse;

	// ---- Determine canonical slug ----
	let canonicalSlug = tenantUrlContext.tenantSlug;
	let tenantDomain: TenantDomainContext | null = null;
	let resolvedSession:
		| { value: Awaited<ReturnType<typeof auth.api.getSession>> }
		| undefined;

	if (canonicalSlug) {
		const tenantSlug = canonicalSlug;
		const tenantLookup = () =>
			measurePerformance("proxy.tenant", () =>
				findTenantDomainBySubdomain(tenantSlug),
			);
		if (canonicalSlug === "app" || canonicalSlug.startsWith("app.")) {
			tenantDomain = await tenantLookup();
		} else {
			// Both reads are independent. Authorization still awaits the live workspace checks below.
			const [domainRecord, session] = await Promise.all([
				tenantLookup(),
				measurePerformance("proxy.session", () =>
					auth.api.getSession({ headers: req.headers }),
				),
			]);
			tenantDomain = domainRecord;
			resolvedSession = { value: session };
		}
	}

	if (!canonicalSlug) {
		const bareHost = tenantUrlContext.customDomainLookupHost;

		if (bareHost) {
			const record = await measurePerformance("proxy.custom-domain", () =>
				findTenantDomainByCustomDomain(bareHost),
			);
			if (record?.subdomain) {
				canonicalSlug = record.subdomain;
				tenantDomain = record;
			}
		}
	}
	// console.log({ canonicalSlug, host });
	// Remove the locale from the pathname
	const pathnameWithoutLocale = tenantUrlContext.productPath;
	//  ? nextUrl.pathname.slice(pathnameLocale.length + 1)
	//  : nextUrl.pathname;
	// Create a new URL without the locale in the pathname
	const newUrl = new URL(pathnameWithoutLocale || "/", req.url);
	const encodedSearchParams = `${newUrl?.pathname?.substring(1)}${
		newUrl.search
	}`;
	const isSignupRoute = tenantUrlContext.productPath === "/sign-up";
	const publicRoutes = new Set([
		"/login",
		"/forgot-password",
		"/reset-password",
		"/verify-email",
	]);
	const isPublicRoute =
		isSignupRoute || publicRoutes.has(tenantUrlContext.productPath);
	const isPublicShareRoute =
		tenantUrlContext.productPath.includes("/student-report") ||
		isPublicAssessmentRecordingPath(tenantUrlContext.productPath);
	const allowAuthenticatedPublicRoute =
		tenantUrlContext.productPath === "/forgot-password" ||
		tenantUrlContext.productPath === "/reset-password" ||
		tenantUrlContext.productPath === "/verify-email";

	// ---- Handle special app subdomain ----
	if (canonicalSlug === "app" || canonicalSlug?.startsWith("app.")) {
		return NextResponse.rewrite(new URL("/app/", req.url));
	}

	const session = resolvedSession
		? resolvedSession.value
		: await measurePerformance("proxy.session", () =>
				auth.api.getSession({ headers: req.headers }),
			);

	const existingTenantSessionCookieValue = getTenantWorkspaceCookieValue(
		req,
		canonicalSlug,
	);
	const recoveredTenantSessionCookie = session
		? await measurePerformance("proxy.workspace", () =>
				resolveTenantWorkspaceCookie({
					existingCookieValue: existingTenantSessionCookieValue,
					session,
					tenantSlug: canonicalSlug,
				}),
			)
		: null;
	const hasTenantSessionCookie = Boolean(recoveredTenantSessionCookie);
	const sessionTenantAccess = session ? hasTenantSessionCookie : null;
	const withRecoveredTenantSessionCookie = <T extends NextResponse>(
		response: T,
	) => {
		if (
			canonicalSlug &&
			recoveredTenantSessionCookie &&
			recoveredTenantSessionCookie !== existingTenantSessionCookieValue
		) {
			response.cookies.set(
				getTenantWorkspaceCookieName(canonicalSlug),
				recoveredTenantSessionCookie,
				workspaceCookieOptions(
					parseWorkspaceCookie(recoveredTenantSessionCookie)?.remembered ===
						true,
				),
			);
		} else if (
			canonicalSlug &&
			existingTenantSessionCookieValue &&
			!recoveredTenantSessionCookie
		) {
			response.cookies.set(getTenantWorkspaceCookieName(canonicalSlug), "", {
				...workspaceCookieOptions(false),
				maxAge: 0,
			});
		}
		return response;
	};

	if (tenantUrlContext.productPath === "/" || isPublicRoute) {
		if (
			session &&
			sessionTenantAccess !== false &&
			!allowAuthenticatedPublicRoute &&
			(tenantUrlContext.productPath !== "/login" || hasTenantSessionCookie)
		) {
			const defaultLink = getFirstPermittedHref({
				role: session.user?.role,
			});

			if (getHrefPathname(defaultLink) !== tenantUrlContext.productPath) {
				return withRecoveredTenantSessionCookie(
					NextResponse.redirect(
						tenantUrlDevMode
							? buildTenantRedirectUrl(
									{ ...tenantUrlContext, tenantSlug: canonicalSlug },
									defaultLink,
									req.url,
									tenantUrlConfig,
								)
							: new URL(defaultLink, req.url),
					),
				);
			}
		}

		if (!isPublicRoute && !session) {
			const loginUrl = tenantUrlDevMode
				? buildTenantRedirectUrl(
						{ ...tenantUrlContext, tenantSlug: canonicalSlug },
						"/login",
						req.url,
						tenantUrlConfig,
					)
				: new URL("/login", req.url);

			if (encodedSearchParams) {
				loginUrl.searchParams.append("return_to", encodedSearchParams);
			}

			return withRecoveredTenantSessionCookie(NextResponse.redirect(loginUrl));
		}
	}

	if (!session && !isPublicRoute && !isPublicShareRoute) {
		// TODO: check if domain tenant exists, else redirect to tenant not found page

		const url = tenantUrlDevMode
			? buildTenantRedirectUrl(
					{ ...tenantUrlContext, tenantSlug: canonicalSlug },
					"/login",
					req.url,
					tenantUrlConfig,
				)
			: new URL("/login", req.url);

		if (encodedSearchParams) {
			url.searchParams.append("return_to", encodedSearchParams);
		}

		return withRecoveredTenantSessionCookie(NextResponse.redirect(url));
	}

	if (
		session &&
		sessionTenantAccess === false &&
		!isPublicRoute &&
		!isPublicShareRoute
	) {
		const url = tenantUrlDevMode
			? buildTenantRedirectUrl(
					{ ...tenantUrlContext, tenantSlug: canonicalSlug },
					"/login",
					req.url,
					tenantUrlConfig,
				)
			: new URL("/login", req.url);
		url.searchParams.set("error", "Use an account for this school workspace.");

		if (encodedSearchParams) {
			url.searchParams.append("return_to", encodedSearchParams);
		}

		return withRecoveredTenantSessionCookie(NextResponse.redirect(url));
	}

	// ---- Rewrite to school dashboard route ----
	if (canonicalSlug) {
		const searchParams = url.searchParams.toString();
		const requestHeaders = createDashboardProxyHeaders({
			canonicalSlug,
			recoveredTenantSessionCookie,
			req,
			requestId,
			tenantDomain,
			tenantHeaderNames,
			tenantUrlContext,
		});

		const internalPrefix = toInternalTenantPath(
			{ tenantSlug: canonicalSlug },
			"/",
			tenantUrlConfig,
		).replace(/\/$/, "");
		if (
			url.pathname === internalPrefix ||
			url.pathname.startsWith(`${internalPrefix}/`)
		) {
			return withRecoveredTenantSessionCookie(
				NextResponse.next({
					request: {
						headers: requestHeaders,
					},
				}),
			);
		}

		const internalPath = tenantUrlContext.tenantSlug
			? tenantUrlContext.internalPath
			: toInternalTenantPath(
					{ tenantSlug: canonicalSlug },
					tenantUrlContext.productPath,
					tenantUrlConfig,
				);
		let rewritePath = `${internalPath}${
			searchParams ? `?${searchParams}` : ""
		}`;

		// Always ensure it starts with a slash.
		if (!rewritePath.startsWith("/")) rewritePath = `/${rewritePath}`;

		return withRecoveredTenantSessionCookie(
			NextResponse.rewrite(new URL(rewritePath, req.url), {
				request: {
					headers: requestHeaders,
				},
			}),
		);
	}

	// ---- Default: continue normally ----
	return NextResponse.next({
		request: {
			headers: createDashboardRoutingHeaders(
				req,
				requestId,
				tenantUrlContext,
				tenantHeaderNames,
			),
		},
	});
}

function createDashboardProxyHeaders({
	canonicalSlug,
	recoveredTenantSessionCookie,
	req,
	requestId,
	tenantDomain,
	tenantHeaderNames,
	tenantUrlContext,
}: {
	canonicalSlug?: string | null;
	recoveredTenantSessionCookie?: string | null;
	req: NextRequest;
	requestId: string;
	tenantDomain?: TenantDomainContext | null;
	tenantHeaderNames: ReturnType<typeof getTenantUrlHeaderNames>;
	tenantUrlContext: ReturnType<typeof getDashboardRoutingContext>;
}) {
	const requestHeaders = createDashboardRoutingHeaders(
		req,
		requestId,
		tenantUrlContext,
		tenantHeaderNames,
	);

	if (canonicalSlug) {
		requestHeaders.set("x-tenant-subdomain", canonicalSlug);
		requestHeaders.set(tenantHeaderNames.domain, canonicalSlug);
	}

	if (tenantDomain?.saasAccountId) {
		requestHeaders.set(tenantHeaderNames.accountId, tenantDomain.saasAccountId);
	}

	if (canonicalSlug) {
		requestHeaders.set(
			"cookie",
			appendCookieHeader(
				req.headers.get("cookie"),
				getTenantWorkspaceCookieName(canonicalSlug),
				recoveredTenantSessionCookie ?? null,
			),
		);
	}

	return requestHeaders;
}

function getHrefPathname(href: string) {
	try {
		return new URL(href, "http://tenant.local").pathname || "/";
	} catch {
		const pathname = href.split(/[?#]/)[0] || "/";
		return pathname.startsWith("/") ? pathname : `/${pathname}`;
	}
}

function getTenantWorkspaceCookieName(tenantSlug: string) {
	return `${tenantSlug}-session-cookie`;
}

function getTenantWorkspaceCookieValue(
	req: NextRequest,
	tenantSlug?: string | null,
) {
	if (!tenantSlug) return null;
	return (
		req.cookies.get(getTenantWorkspaceCookieName(tenantSlug))?.value ?? null
	);
}

function appendCookieHeader(
	cookieHeader: string | null,
	name: string,
	value: string | null,
) {
	const nextCookie =
		value === null ? null : `${name}=${encodeURIComponent(value)}`;
	const existingCookies = (cookieHeader ?? "")
		.split(";")
		.map((cookie) => cookie.trim())
		.filter(Boolean)
		.filter((cookie) => !cookie.startsWith(`${name}=`));

	return (nextCookie ? [...existingCookies, nextCookie] : existingCookies).join(
		"; ",
	);
}

async function resolveTenantWorkspaceCookie({
	existingCookieValue,
	session,
	tenantSlug,
}: {
	existingCookieValue?: string | null;
	session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
	tenantSlug?: string | null;
}) {
	const token = session.session.token;
	const userId = session.user.id;
	if (!tenantSlug || !token || !userId) return null;
	const existing = parseWorkspaceCookie(existingCookieValue);
	const workspace = await resolveTenantWorkspace(prisma, {
		token,
		userId,
		tenantSlug,
		selection: workspaceCookieSelection(existing, {
			domain: tenantSlug,
			token,
			userId,
		}),
	});
	if (!workspace) return null;
	const nextCookie: AuthCookie = {
		...workspace,
		auth: { bearerToken: token, userId },
		remembered: existing?.remembered === true,
	};
	return JSON.stringify(nextCookie);
}
