import { prisma } from "@school-clerk/db";
import { resolveDashboardAppRootDomain } from "@school-clerk/utils";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "./auth/server";
import { getFirstPermittedHref } from "./components/sidebar/links";
import { env } from "./env";
import {
  getCanonicalTenantSlugFromHost,
  getCustomDomainLookupHost,
  isAppRootDomainHost,
} from "./utils/tenant-host";

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

  const host = req.headers.get("host") ?? "";
  const url = req.nextUrl;

  // ---- Determine canonical slug ----
  let canonicalSlug = getCanonicalTenantSlugFromHost(host, hostName);
  const isAppRootHost = isAppRootDomainHost(host, hostName);
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
    const bareHost = getCustomDomainLookupHost(host);

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
  const nextUrl = req.nextUrl;
  const pathnameLocale = nextUrl.pathname; //.split("/", 2)?.[1];
  // Remove the locale from the pathname
  const pathnameWithoutLocale = pathnameLocale;
  //  ? nextUrl.pathname.slice(pathnameLocale.length + 1)
  //  : nextUrl.pathname;
  // Create a new URL without the locale in the pathname
  const newUrl = new URL(pathnameWithoutLocale || "/", req.url);
  const encodedSearchParams = `${newUrl?.pathname?.substring(1)}${
    newUrl.search
  }`;
  const isSignupRoute = url.pathname === "/sign-up";
  const publicRoutes = new Set(["/login", "/dev-quick-login"]);
  const isPublicRoute = isSignupRoute || publicRoutes.has(url.pathname);
  const isPublicShareRoute =
    url.pathname.includes("/student-report") ||
    url.pathname.includes("/assessment-recording");
  const allowAuthenticatedPublicRoute =
    process.env.NODE_ENV !== "production" &&
    url.pathname === "/dev-quick-login";

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

  if (url.pathname === "/" || isPublicRoute) {
    if (
      session &&
      sessionTenantAccess !== false &&
      !allowAuthenticatedPublicRoute
    ) {
      const defaultLink = getFirstPermittedHref({
        role: session.user?.role,
      });
      console.log({ defaultLink });
      return NextResponse.redirect(new URL(defaultLink, req.url));
    }

    if (!isPublicRoute) {
      const loginUrl = new URL("/login", req.url);

      if (encodedSearchParams) {
        loginUrl.searchParams.append("return_to", encodedSearchParams);
      }

      return NextResponse.redirect(loginUrl);
    }
  }

  if (!session && !isPublicRoute && !isPublicShareRoute) {
    // TODO: check if domain tenant exists, else redirect to tenant not found page

    const url = new URL("/login", req.url);

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
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "Use an account for this school workspace.");

    if (encodedSearchParams) {
      url.searchParams.append("return_to", encodedSearchParams);
    }

    return NextResponse.redirect(url);
  }

  // ---- Rewrite to school dashboard route ----
  if (canonicalSlug) {
    const searchParams = url.searchParams.toString();
    const path = `${url.pathname}${searchParams ? `?${searchParams}` : ""}`;
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-school-clerk-pathname", url.pathname);
    requestHeaders.set("x-school-clerk-domain", canonicalSlug);

    if (tenantDomain?.saasAccountId) {
      requestHeaders.set(
        "x-school-clerk-saas-account-id",
        tenantDomain.saasAccountId,
      );
    }

    let rewritePath = `/dashboard/${canonicalSlug}${path}`;

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
