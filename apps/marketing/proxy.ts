import { type NextRequest, NextResponse } from "next/server";

const localRootDomain =
  process.env.SCHOOL_CLERK_LOCAL_ROOT_DOMAIN?.trim() ||
  "school-clerk.localhost";
const dashboardProxyTarget =
  process.env.SCHOOL_CLERK_LOCAL_DASHBOARD_PROXY_TARGET?.trim() ||
  `http://127.0.0.1:${process.env.SCHOOL_CLERK_DASHBOARD_APP_PORT?.trim() || "2200"}`;

function stripPort(host: string) {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

function isDashboardTenantHost(host: string) {
  const hostname = stripPort(host);

  return Boolean(
    hostname &&
      hostname !== localRootDomain &&
      hostname.endsWith(`.${localRootDomain}`),
  );
}

export default function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  if (!isDashboardTenantHost(host)) {
    return NextResponse.next();
  }

  const rewriteUrl = new URL(request.nextUrl.pathname, dashboardProxyTarget);
  rewriteUrl.search = request.nextUrl.search;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-forwarded-host", host);
  requestHeaders.set(
    "x-forwarded-proto",
    request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol,
  );

  return NextResponse.rewrite(rewriteUrl, {
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/:path*"],
};
