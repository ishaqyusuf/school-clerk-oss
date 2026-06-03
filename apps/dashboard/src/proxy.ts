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
import { getDashboardTenantUrlConfig } from "./utils/tenant-url-config";

type TenantDomainContext = {
  subdomain: string | null;
  saasAccountId: string | null;
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
    tenantDomain = await prisma.tenantDomain.findFirst({
      where: {
        deletedAt: null,
        subdomain: canonicalSlug,
      },
      select: {
        subdomain: true,
        saasAccountId: true,
      },
    });
  }

  if (!canonicalSlug && !isAppRootHost) {
    const bareHost = tenantUrlContext.customDomainLookupHost;

    if (bareHost) {
      const record = await prisma.tenantDomain.findFirst({
        where: {
          customDomain: bareHost,
          deletedAt: null,
        },
        select: {
          subdomain: true,
          saasAccountId: true,
        },
      });
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
  const publicRoutes = new Set(["/login", "/dev-quick-login"]);
  const isPublicRoute =
    isSignupRoute || publicRoutes.has(tenantUrlContext.productPath);
  const isPublicShareRoute =
    tenantUrlContext.productPath.includes("/student-report") ||
    tenantUrlContext.productPath.includes("/assessment-recording");
  const allowAuthenticatedPublicRoute =
    process.env.NODE_ENV !== "production" &&
    tenantUrlContext.productPath === "/dev-quick-login";

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
  const hasTenantSessionCookie = hasTenantWorkspaceCookie(req, canonicalSlug);

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
        return NextResponse.redirect(
          tenantUrlDevMode
            ? buildTenantRedirectUrl(
                { ...tenantUrlContext, tenantSlug: canonicalSlug },
                defaultLink,
                req.url,
                tenantUrlConfig,
              )
            : new URL(defaultLink, req.url),
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

      return NextResponse.redirect(loginUrl);
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

    return NextResponse.redirect(url);
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

    return NextResponse.redirect(url);
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

    const internalPrefix = toInternalTenantPath(
      { tenantSlug: canonicalSlug },
      "/",
      tenantUrlConfig,
    ).replace(/\/$/, "");
    if (
      url.pathname === internalPrefix ||
      url.pathname.startsWith(`${internalPrefix}/`)
    ) {
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
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

    return NextResponse.rewrite(new URL(rewritePath, req.url), {
      request: {
        headers: requestHeaders,
      },
    });
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

function hasTenantWorkspaceCookie(
  req: NextRequest,
  tenantSlug?: string | null,
) {
  if (!tenantSlug) return false;

  const value = req.cookies.get(`${tenantSlug}-session-cookie`)?.value;
  if (!value) return false;

  try {
    return Boolean(JSON.parse(value)?.schoolId);
  } catch {
    return false;
  }
}
