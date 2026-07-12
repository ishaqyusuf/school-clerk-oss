import { prisma } from "@school-clerk/db";
import {
  buildTenantRedirectUrl,
  getTenantUrlHeaderNames,
  resolveTenantUrlContext,
  toInternalTenantPath,
} from "@school-clerk/tenant-url";
import { resolveDashboardAppRootDomain } from "@school-clerk/utils";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "./auth/server";
import { getFirstPermittedHref } from "./components/sidebar/links";
import { env } from "./env";
import {
  findTenantDomainByCustomDomain,
  findTenantDomainBySubdomain,
  type TenantDomainContext,
} from "./utils/tenant-domain-context";
import { getDashboardTenantUrlConfig } from "./utils/tenant-url-config";

type TenantWorkspaceCookie = {
  domain: string;
  sessionId?: string;
  schoolId?: string;
  termId?: string;
  sessionTitle?: string;
  termTitle?: string;
  auth?: {
    bearerToken: string;
    userId: string;
  };
  remembered?: boolean;
};

const workspaceSessionMaxAge = 60 * 60 * 24 * 30;
const workspaceCookieOptions = {
  httpOnly: true,
  maxAge: workspaceSessionMaxAge,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export const config = {
  matcher: [
    "/((?!api/|_next/|_static/|__nextjs|_vercel|fonts/|[\\w-]+\\.\\w+).*)",
  ],
};

export default async function proxy(req: NextRequest) {
  const hostName = resolveDashboardAppRootDomain(env.APP_ROOT_DOMAIN);
  if (!hostName) throw new Error("APP_ROOT_DOMAIN is not defined");

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

  // ---- Determine canonical slug ----
  let canonicalSlug = tenantUrlContext.tenantSlug;
  const isAppRootHost =
    tenantUrlContext.isAppRootHost && !tenantUrlContext.tenantSlug;
  let tenantDomain: TenantDomainContext | null = null;

  if (canonicalSlug) {
    tenantDomain = await findTenantDomainBySubdomain(canonicalSlug);
  }

  if (!canonicalSlug && !isAppRootHost) {
    const bareHost = tenantUrlContext.customDomainLookupHost;

    if (bareHost) {
      const record = await findTenantDomainByCustomDomain(bareHost);
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
    "/dev-quick-login",
  ]);
  const isPublicRoute =
    isSignupRoute || publicRoutes.has(tenantUrlContext.productPath);
  const isPublicShareRoute =
    tenantUrlContext.productPath.includes("/student-report") ||
    tenantUrlContext.productPath.includes("/assessment-recording");
  const allowAuthenticatedPublicRoute =
    tenantUrlContext.productPath === "/forgot-password" ||
    tenantUrlContext.productPath === "/reset-password" ||
    tenantUrlContext.productPath === "/verify-email" ||
    (process.env.NODE_ENV !== "production" &&
      tenantUrlContext.productPath === "/dev-quick-login");

  // ---- Handle special app subdomain ----
  if (canonicalSlug === "app" || canonicalSlug?.startsWith("app.")) {
    return NextResponse.rewrite(new URL("/app/", req.url));
  }

  if (isAppRootHost) {
    if (isSignupRoute) {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL("/sign-up", req.url));
  }

  const session = await auth.api.getSession({
    headers: req.headers,
  });

  const sessionTenantAccess = await getSessionTenantAccess({
    userId: session?.user?.id,
    tenantDomain,
  });
  const existingTenantSessionCookieValue = getTenantWorkspaceCookieValue(
    req,
    canonicalSlug,
  );
  const hasExistingTenantSessionCookie = hasUsableTenantWorkspaceCookie({
    session,
    tenantSlug: canonicalSlug,
    value: existingTenantSessionCookieValue,
  });
  const recoveredTenantSessionCookie =
    session && sessionTenantAccess !== false && !hasExistingTenantSessionCookie
      ? await resolveTenantWorkspaceCookie({
          existingCookieValue: existingTenantSessionCookieValue,
          session,
          tenantSlug: canonicalSlug,
        })
      : null;
  const hasTenantSessionCookie =
    hasExistingTenantSessionCookie || Boolean(recoveredTenantSessionCookie);
  const withRecoveredTenantSessionCookie = <T extends NextResponse>(
    response: T,
  ) => {
    if (canonicalSlug && recoveredTenantSessionCookie) {
      response.cookies.set(
        getTenantWorkspaceCookieName(canonicalSlug),
        recoveredTenantSessionCookie,
        workspaceCookieOptions,
      );
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
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set(
      tenantHeaderNames.pathname,
      tenantUrlContext.productPath,
    );
    requestHeaders.set(tenantHeaderNames.domain, canonicalSlug);

    if (tenantUrlDevMode) {
      requestHeaders.set(tenantHeaderNames.urlStyle, tenantUrlContext.style);
      requestHeaders.set(
        tenantHeaderNames.externalBasePath,
        tenantUrlContext.externalBasePath,
      );
      requestHeaders.set(
        tenantHeaderNames.externalPath,
        tenantUrlContext.externalPath,
      );
    }

    if (tenantDomain?.saasAccountId) {
      requestHeaders.set(
        tenantHeaderNames.accountId,
        tenantDomain.saasAccountId,
      );
    }

    if (recoveredTenantSessionCookie) {
      requestHeaders.set(
        "cookie",
        appendCookieHeader(
          req.headers.get("cookie"),
          getTenantWorkspaceCookieName(canonicalSlug),
          recoveredTenantSessionCookie,
        ),
      );
    }

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

    // ✅ Always ensure it starts with a slash
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
  return NextResponse.next();
}

async function getSessionTenantAccess({
  userId,
  tenantDomain,
}: {
  userId?: string;
  tenantDomain: TenantDomainContext | null;
}) {
  if (!userId || !tenantDomain?.saasAccountId) return null;

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
    },
    select: {
      saasAccountId: true,
    },
  });

  return user?.saasAccountId === tenantDomain.saasAccountId;
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

function hasUsableTenantWorkspaceCookie({
  session,
  tenantSlug,
  value,
}: {
  session: Awaited<ReturnType<typeof auth.api.getSession>>;
  tenantSlug?: string | null;
  value?: string | null;
}) {
  if (!value) return false;

  try {
    const cookie = JSON.parse(value) as TenantWorkspaceCookie;

    return Boolean(
      tenantSlug &&
        cookie?.schoolId &&
        cookie?.domain === tenantSlug &&
        cookie?.auth?.userId &&
        cookie?.auth?.bearerToken &&
        (!session?.user?.id || cookie.auth.userId === session.user.id) &&
        (!session?.session?.token ||
          cookie.auth.bearerToken === session.session.token),
    );
  } catch {
    return false;
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
  return req.cookies.get(getTenantWorkspaceCookieName(tenantSlug))?.value ?? null;
}

function parseTenantWorkspaceCookie(value?: string | null) {
  if (!value) return {} as TenantWorkspaceCookie;

  try {
    return JSON.parse(value) as TenantWorkspaceCookie;
  } catch {
    return {} as TenantWorkspaceCookie;
  }
}

function appendCookieHeader(
  cookieHeader: string | null,
  name: string,
  value: string,
) {
  const encodedValue = encodeURIComponent(value);
  const nextCookie = `${name}=${encodedValue}`;
  const existingCookies = (cookieHeader ?? "")
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .filter((cookie) => !cookie.startsWith(`${name}=`));

  return [...existingCookies, nextCookie].join("; ");
}

function findCurrentDatedTerm<
  T extends {
    startDate: Date | null;
    endDate: Date | null;
    createdAt?: Date | null;
  },
>(terms: T[], now = new Date()) {
  const startedTerms = terms.filter(
    (term) => term.startDate && term.startDate <= now,
  );
  const activeBoundedTerm = startedTerms
    .filter((term) => term.endDate && term.endDate >= now)
    .sort((a, b) => b.startDate!.getTime() - a.startDate!.getTime())[0];

  if (activeBoundedTerm) return activeBoundedTerm;

  return (
    startedTerms
      .filter((term) => !term.endDate)
      .sort((a, b) => b.startDate!.getTime() - a.startDate!.getTime())[0] ??
    null
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
  const bearerToken = session.session?.token;
  const userId = session.user?.id;

  if (!tenantSlug || !bearerToken || !userId) return null;

  const existingCookie = parseTenantWorkspaceCookie(existingCookieValue);
  const school = await prisma.schoolProfile.findFirst({
    where: {
      deletedAt: null,
      subDomain: tenantSlug,
    },
    select: {
      id: true,
      sessions: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          title: true,
          terms: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
              title: true,
              sessionId: true,
              startDate: true,
              endDate: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
    },
  });

  if (!school) return null;

  const termProfiles = school.sessions.flatMap((schoolSession) =>
    schoolSession.terms.map((term) => ({
      ...term,
      sessionId: schoolSession.id,
      sessionTitle: schoolSession.title,
    })),
  );
  const selectedTerm = termProfiles.find(
    (term) => term.id === existingCookie.termId,
  );
  const term =
    selectedTerm ?? findCurrentDatedTerm(termProfiles) ?? termProfiles[0];
  const schoolSession =
    school.sessions.find((item) => item.id === term?.sessionId) ||
    school.sessions.find((item) => item.id === existingCookie.sessionId) ||
    school.sessions[0];
  const nextCookie: TenantWorkspaceCookie = {
    ...existingCookie,
    auth: {
      bearerToken,
      userId,
    },
    domain: tenantSlug,
    remembered: existingCookie.remembered !== false,
    schoolId: school.id,
    sessionId: schoolSession?.id,
    sessionTitle: schoolSession?.title ?? existingCookie.sessionTitle,
    termId: term?.id,
    termTitle: term?.title ?? existingCookie.termTitle,
  };

  return JSON.stringify(nextCookie);
}
