import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createI18nMiddleware } from "next-international/middleware";
import { env } from "./env";
import { getSession } from "./auth/server";
// export const config = {
//   matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
// };
export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    "/((?!api/|_next/|_static/|__nextjs|_vercel|[\\w-]+\\.\\w+).*)",
  ],
};

const publicRoutes = ["/", "/about", "/help", "/login"];

async function isAuthorized(request: Request): Promise<boolean> {
  const token = request.headers.get("cookie")?.match(/auth_token=([^;]*)/)?.[1];
  return !!token; // replace with real auth logic
}

const I18nMiddleware = createI18nMiddleware({
  locales: ["en", "fr"],
  defaultLocale: "en",
  //   resolveLocaleFromRequest: (request) => {
  //     const { pathname } = new URL(request.url)
  //     const pathLocale = pathname.split('/')[1]
  //     if (['en', 'fr'].includes(pathLocale)) return pathLocale
  //     return 'en'
  //   },
});

export async function proxy(request: NextRequest) {
  const hostName = env.APP_ROOT_DOMAIN;
  const url = new URL(request.url);
  const { pathname, hostname, search } = url;

  // 🟩 Extract tenant from subdomain: tenant.domain.com
  //   const domainParts = hostname.split(".");
  //   const tenant = domainParts.length > 2 ? domainParts[0] : null;
  const host = request.headers.get("host") ?? "";
  const subdomain = host.replace(`.${hostName}`, "");
  // Skip Next.js internals and API
  if (pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }
  // 🟦 Locale handling (default to 'en' if none)
  const locale = I18nMiddleware(request)?.headers?.get("x-locale") || "en";

  console.log({
    subdomain,
    pathname,
    locale,
  });

  // 🟨 Auth check
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));
  //   const session = await getSession();
  //   const authorized = !!session?.user;
  // const authorized = await isAuthorized(request);

  // if (!isPublic && !authorized) {
  //   // /${locale}
  //   const loginUrl = new URL(`/login`, request.url);
  //   loginUrl.searchParams.append(
  //     "return_to",
  //     encodeURIComponent(pathname + search)
  //   );
  //   return NextResponse.redirect(loginUrl);
  // }
  if (subdomain === "app")
    return NextResponse.rewrite(new URL(`/app${pathname}`, request.url));

  // 🟥 Rewrite tenant subdomain to internal route
  if (subdomain) {
    // Example: https://schoolA.domain.com/students
    // becomes: /en/dashboard/schoolA/students
    // /${locale}
    const newPath = `/dashboard/${subdomain}${pathname}`;
    // if (pathname == "/")
    //   return NextResponse.redirect(new URL("/students/list", request.url));
    return NextResponse.rewrite(new URL(newPath, request.url));
  }
  return NextResponse.next();
}

// export const config = {
//   matcher: ['/((?!_next|api|.*\\..*).*)'],
// }
