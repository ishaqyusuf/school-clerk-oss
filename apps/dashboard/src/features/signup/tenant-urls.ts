import "server-only";
import { buildTenantAuthUrl, parseAuthOrigin, resolveAuthConfiguration } from "@school-clerk/utils/auth-url";

function dashboardOrigin() {
  return resolveAuthConfiguration({
    nodeEnv: process.env.NODE_ENV, authUrl: process.env.BETTER_AUTH_URL,
    dashboardUrl: process.env.DASHBOARD_APP_URL, publicAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    appRootDomain: process.env.APP_ROOT_DOMAIN,
  }).baseUrl;
}

function siteOrigin() {
  const configured = (process.env.SCHOOL_SITE_ROOT_DOMAIN ??
    (process.env.NODE_ENV === "production" ? process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_ROOT_DOMAIN : process.env.APP_ROOT_DOMAIN))?.trim();
  const root = configured ? parseAuthOrigin(configured.includes("://") ? configured : `https://${configured}`) : null;
  if (!root || root.hostname === "localhost" || root.hostname.includes(":") ||
    /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(root.hostname) || root.hostname.endsWith(".vercel.app")) {
    throw new Error("A tenant-capable HTTPS school-site origin is required.");
  }
  root.hostname = root.hostname.replace(/^dashboard\./, "");
  if (["school-clerk.localhost", "school-clerk-dashboard.localhost"].includes(root.hostname)) {
    root.hostname = "school-clerk-site.localhost";
  }
  return root;
}

export function getSchoolSiteRootDomain() { return siteOrigin().host; }
export function getSignupHostSuffix() { return getSchoolSiteRootDomain(); }
export function getSignupPreviewSuffix() { return getSignupHostSuffix(); }

export function buildDashboardSignupUrl(_options?: {
  currentHost?: string | null; currentProtocol?: string | null; currentUrl?: string | null;
}) {
  return new URL("/sign-up", dashboardOrigin()).toString();
}

export function buildSchoolSiteUrl(subdomain: string) {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) throw new Error("Invalid school slug.");
  const root = siteOrigin();
  root.hostname = `${subdomain}.${root.hostname}`;
  return root.toString();
}

export function buildDashboardTenantUrl(subdomain: string, path: "" | "/" | "/login" | "/onboarding/welcome" = "") {
  return buildTenantAuthUrl({ baseUrl: dashboardOrigin(), tenantSlug: subdomain, path: path || "/" });
}
