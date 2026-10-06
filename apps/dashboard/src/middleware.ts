import { prisma, resolveTenantWorkspace } from "@school-clerk/db";
import { getPerformanceRequestId, measurePerformance, withPerformanceContext } from "@school-clerk/utils/server-performance";
import { parseWorkspaceCookie, workspaceCookieOptions, workspaceCookieSelection, type AuthCookie } from "./utils/workspace-cookie";
import {
  buildTenantRedirectUrl,
  getTenantUrlHeaderNames,
  resolveTenantUrlContext,
  toInternalTenantPath,
} from "@school-clerk/tenant-url";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "./auth/server";
import { getFirstPermittedHref } from "./components/sidebar/links";
import {
  findTenantDomainByCustomDomain,
  findTenantDomainBySubdomain,
  type TenantDomainContext,
} from "./utils/tenant-domain-context";
import { getDashboardTenantUrlConfig } from "./utils/tenant-url-config";

const protectedProxyHeaderNames = [
  "x-user-id",
  "x-session-token",
  "x-tenant-hostname",
  "x-tenant-subdomain",
  "x-pathname",
];

// Database-backed tenant/session checks must run near the production database.
export const config = {
  runtime: "nodejs",
  regions: ["iad1"],
  matcher: [
    "/((?!api/|_next/|_static/|__nextjs|_vercel|fonts/|[\\w-]+\\.\\w+).*)",
  ],
};

export default async function middleware(req: NextRequest) {
  const requestId = crypto.randomUUID();
  return withPerformanceContext(requestId, () => measurePerformance("proxy.total", () => handleProxy(req, requestId)));
}

async function handleProxy(req: NextRequest, requestId: string) {
  const host = getRequestHost(req);
  const url = req.nextUrl;
  const tenantUrlConfig = getDashboardTenantUrlConfig();
  const tenantHeaderNames = getTenantUrlHeaderNames(tenantUrlConfig);
  const tenantUrlDevMode = tenantUrlConfig.enablePathStyleHosts !== false;
  const tenantUrlContext = resolveTenantUrlContext(
    {
      host,
      pathname: url.pathname,
      protocol: req.headers.get("x-forwarded-proto"),
    },
    tenantUrlConfig,
  );
  const baseRequestHeaders = createDashboardProxyHeaders({
    req,
    requestId,
    tenantHeaderNames,
    tenantUrlContext,
  });

  // ---- Determine canonical slug ----
  let canonicalSlug = tenantUrlContext.tenantSlug;
  const isAppRootHost =
    tenantUrlContext.isAppRootHost && !tenantUrlContext.tenantSlug;
  let tenantDomain: TenantDomainContext | null = null;

  if (canonicalSlug) {
    tenantDomain = await measurePerformance("proxy.tenant", () => findTenantDomainBySubdomain(canonicalSlug!));
  }

  if (!canonicalSlug && !isAppRootHost) {
    const bareHost = tenantUrlContext.customDomainLookupHost;

    if (bareHost) {
      const record = await measurePerformance("proxy.custom-domain", () => findTenantDomainByCustomDomain(bareHost));
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
    tenantUrlContext.productPath.includes("/assessment-recording");
  const allowAuthenticatedPublicRoute =
    tenantUrlContext.productPath === "/forgot-password" ||
    tenantUrlContext.productPath === "/reset-password" ||
    tenantUrlContext.productPath === "/verify-email";

  // ---- Handle special app subdomain ----
  if (canonicalSlug === "app" || canonicalSlug?.startsWith("app.")) {
    return NextResponse.rewrite(new URL("/app/", req.url));
  }

  if (isAppRootHost) {
    if (isSignupRoute) {
      return NextResponse.next({
        request: {
          headers: baseRequestHeaders,
        },
      });
    }

    return NextResponse.redirect(new URL("/sign-up", req.url));
  }

  const session = await measurePerformance("proxy.session", () => auth.api.getSession({
    headers: req.headers,
  }));

  const existingTenantSessionCookieValue = getTenantWorkspaceCookieValue(req, canonicalSlug);
  const recoveredTenantSessionCookie = session
    ? await measurePerformance("proxy.workspace", () => resolveTenantWorkspaceCookie({
        existingCookieValue: existingTenantSessionCookieValue,
        session,
        tenantSlug: canonicalSlug,
      }))
    : null;
  const hasTenantSessionCookie = Boolean(recoveredTenantSessionCookie);
  const sessionTenantAccess = session ? hasTenantSessionCookie : null;
  const withRecoveredTenantSessionCookie = <T extends NextResponse>(response: T) => {
    if (canonicalSlug && recoveredTenantSessionCookie &&
      recoveredTenantSessionCookie !== existingTenantSessionCookieValue) {
      response.cookies.set(getTenantWorkspaceCookieName(canonicalSlug), recoveredTenantSessionCookie,
        workspaceCookieOptions(parseWorkspaceCookie(recoveredTenantSessionCookie)?.remembered === true));
    } else if (canonicalSlug && existingTenantSessionCookieValue && !recoveredTenantSessionCookie) {
      response.cookies.set(getTenantWorkspaceCookieName(canonicalSlug), "",
        { ...workspaceCookieOptions(false), maxAge: 0 });
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
      headers: baseRequestHeaders,
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
  tenantUrlContext: ReturnType<typeof resolveTenantUrlContext>;
}) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", getPerformanceRequestId(requestId));
  const protectedHeaders = [
    ...protectedProxyHeaderNames,
    tenantHeaderNames.domain,
    tenantHeaderNames.pathname,
    tenantHeaderNames.urlStyle,
    tenantHeaderNames.externalBasePath,
    tenantHeaderNames.externalPath,
    tenantHeaderNames.accountId,
  ];

  for (const header of protectedHeaders) {
    requestHeaders.delete(header);
  }

  requestHeaders.set("x-pathname", tenantUrlContext.productPath);
  requestHeaders.set(tenantHeaderNames.pathname, tenantUrlContext.productPath);
  requestHeaders.set(tenantHeaderNames.urlStyle, tenantUrlContext.style);
  requestHeaders.set(
    tenantHeaderNames.externalBasePath,
    tenantUrlContext.externalBasePath,
  );
  requestHeaders.set(
    tenantHeaderNames.externalPath,
    tenantUrlContext.externalPath,
  );

  if (tenantUrlContext.style === "custom-domain") {
    const tenantHostname = tenantUrlContext.customDomainLookupHost;

    if (tenantHostname) {
      requestHeaders.set("x-tenant-hostname", tenantHostname);
    }
  }

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

function getRequestHost(req: NextRequest) {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost?.split(",")[0]?.trim() || req.headers.get("host");

  return host ?? "";
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
  const nextCookie = value === null ? null : `${name}=${encodeURIComponent(value)}`;
  const existingCookies = (cookieHeader ?? "")
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .filter((cookie) => !cookie.startsWith(`${name}=`));

  return (nextCookie ? [...existingCookies, nextCookie] : existingCookies).join("; ");
}

async function resolveTenantWorkspaceCookie({
  existingCookieValue, session, tenantSlug,
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
    token, userId, tenantSlug,
    selection: workspaceCookieSelection(existing, { domain: tenantSlug, token, userId }),
  });
  if (!workspace) return null;
  const nextCookie: AuthCookie = {
    ...workspace, auth: { bearerToken: token, userId }, remembered: existing?.remembered === true,
  };
  return JSON.stringify(nextCookie);
}
