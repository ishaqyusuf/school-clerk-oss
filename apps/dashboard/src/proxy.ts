import { NextResponse, type NextRequest } from "next/server";
import { env } from "./env";

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

export default function proxy(req: NextRequest) {
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

  // ---- Handle special app subdomain ----
  if (subdomain === "app" || subdomain.startsWith("app.")) {
    return NextResponse.rewrite(new URL("/app/", req.url));
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
    console.log({ host, subdomain, rewritePath, reqUrl: req.url });

    return NextResponse.rewrite(new URL(rewritePath, req.url));
  }

  // ---- Default: continue normally ----
  return NextResponse.next();
}
