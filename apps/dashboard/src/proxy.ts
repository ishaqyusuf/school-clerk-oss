import { NextResponse, type NextRequest } from "next/server";
import { env } from "./env";
import { auth } from "./auth/server";
import { headers } from "next/headers";

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|fonts).*)"],
};

export default async function proxy(req: NextRequest) {
  const hostName = env.APP_ROOT_DOMAIN; // e.g. "schoolclerk-dashboard.vercel.app"
  if (!hostName) throw new Error("APP_ROOT_DOMAIN is not defined");

  const host = req.headers.get("host") ?? "";
  const url = req.nextUrl;
  const isProd = env.NODE_ENV === "production";

  // ---- Determine subdomain ----
  let subdomain = host
    .replace(`.${hostName}`, "")
    .replace(".vercel.app", "")
    .replace(".localhost:2200", "")
    .trim();

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

  // ---- Handle special app subdomain ----
  if (subdomain === "app" || subdomain.startsWith("app.")) {
    return NextResponse.rewrite(new URL("/app/", req.url));
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session && url.pathname !== "/login") {
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

    const dashboardSlug = isProd ? subdomain : subdomain || "local";
    // const rewritePath = `/dashboard/${dashboardSlug}${path}`;
    // return NextResponse.rewrite(new URL(rewritePath, req.url));
    let rewritePath = `/dashboard/${dashboardSlug}${path}`;

    // ✅ Always ensure it starts with a slash
    if (!rewritePath.startsWith("/")) rewritePath = `/${rewritePath}`;

    return NextResponse.rewrite(new URL(rewritePath, req.url));
  }

  // ---- Default: continue normally ----
  return NextResponse.next();
}
