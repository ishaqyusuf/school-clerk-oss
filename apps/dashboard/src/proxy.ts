import { NextResponse, type NextRequest } from "next/server";
import { env } from "./env";
import { auth } from "./auth/server";
import { extractTenantSubdomain } from "./utils/tenant-host";
import { getFirstPermittedHref } from "./components/sidebar/links";
import { resolveDashboardAppRootDomain } from "@school-clerk/utils";

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|fonts).*)"],
};

export default async function proxy(req: NextRequest) {
  const hostName = resolveDashboardAppRootDomain(env.APP_ROOT_DOMAIN);
  if (!hostName) throw new Error("APP_ROOT_DOMAIN is not defined");

  const host = req.headers.get("host") ?? "";
  const url = req.nextUrl;

  // ---- Determine subdomain ----
  const subdomain = extractTenantSubdomain(host, hostName);
  // console.log({ subdomain, host });
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
  const isLogin = url.pathname === "/login";

  // ---- Handle special app subdomain ----
  if (subdomain === "app" || subdomain.startsWith("app.")) {
    return NextResponse.rewrite(new URL("/app/", req.url));
  }

  const session = await auth.api.getSession({
    headers: req.headers,
  });
  if (url.pathname === "/" || isLogin) {
    if (session) {
      const defaultLink = getFirstPermittedHref({
        role: session.user?.role,
      });
      console.log({ defaultLink });
      return NextResponse.redirect(new URL(defaultLink, req.url));
    }

    if (!isLogin) {
      const loginUrl = new URL("/login", req.url);

      if (encodedSearchParams) {
        loginUrl.searchParams.append("return_to", encodedSearchParams);
      }

      return NextResponse.redirect(loginUrl);
    }
  }

  if (
    !session &&
    !isLogin &&
    !url.pathname.includes("/student-report") &&
    !url.pathname.includes("/assessment-recording")
  ) {
    // TODO: check if domain tenant exists, else redirect to tenant not found page

    const url = new URL("/login", req.url);

    if (encodedSearchParams) {
      url.searchParams.append("return_to", encodedSearchParams);
    }

    return NextResponse.redirect(url);
  }

  // ---- Handle custom subdomain (school sites) ----
  if (subdomain && subdomain !== hostName) {
    const searchParams = url.searchParams.toString();
    const path = `${url.pathname}${searchParams ? `?${searchParams}` : ""}`;

    let rewritePath = `/dashboard/${subdomain}${path}`;

    // ✅ Always ensure it starts with a slash
    if (!rewritePath.startsWith("/")) rewritePath = `/${rewritePath}`;

    return NextResponse.rewrite(new URL(rewritePath, req.url));
  }

  // ---- Default: continue normally ----
  return NextResponse.next();
}
