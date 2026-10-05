import { resolveDashboardAppRootDomain } from "./index";

export function parseAuthOrigin(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password ||
      url.search || url.hash || !["/", "/api/auth", "/api/auth/"].includes(url.pathname)) return null;
    return new URL(url.origin);
  } catch {
    return null;
  }
}

function configuredOrigin(value: string | undefined, label: string) {
  const trimmed = value?.trim();
  const parsed = trimmed ? parseAuthOrigin(trimmed.includes("://") ? trimmed : `https://${trimmed}`) : null;
  if (!parsed) throw new Error(`${label} must configure an HTTPS application origin (including the shared proxy port when needed).`);
  return parsed.origin;
}

export function resolveAuthConfiguration(input: {
  nodeEnv?: string; authUrl?: string; dashboardUrl?: string; publicAppUrl?: string; appRootDomain?: string;
}) {
  const explicit = input.authUrl?.trim() || input.dashboardUrl?.trim();
  let baseUrl = configuredOrigin(explicit || (input.nodeEnv === "production" ? input.publicAppUrl : input.appRootDomain),
    "BETTER_AUTH_URL / DASHBOARD_APP_URL or the configured application host");
  if (!explicit && input.nodeEnv !== "production") {
    const configured = new URL(baseUrl);
    configured.hostname = resolveDashboardAppRootDomain(configured.hostname);
    baseUrl = configured.origin;
  }
  const productionUrl = input.publicAppUrl?.trim()
    ? configuredOrigin(input.publicAppUrl, "NEXT_PUBLIC_APP_URL") : baseUrl;
  return { baseUrl, productionUrl };
}

export function buildTenantAuthUrl(input: { baseUrl: string; tenantSlug: string; path: "/" | "/login" | "/onboarding/welcome" | "/reset-password" | "/verify-email" }) {
  const root = parseAuthOrigin(input.baseUrl);
  if (!root || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(input.tenantSlug)) {
    throw new Error("A configured HTTPS origin and canonical school slug are required.");
  }
  if (!["/", "/login", "/onboarding/welcome", "/reset-password", "/verify-email"].includes(input.path)) throw new Error("Unsupported tenant authentication path.");
  if (root.hostname === "localhost" || root.hostname.includes(":") ||
    /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(root.hostname) || root.hostname.endsWith(".vercel.app")) {
    throw new Error("Tenant authentication requires a configured tenant-capable HTTPS dashboard root.");
  }
  const hostname = root.hostname.endsWith(".localhost")
    ? `${input.tenantSlug}.${root.hostname}`
    : `dashboard.${input.tenantSlug}.${root.hostname.replace(/^dashboard\./, "")}`;
  root.hostname = hostname;
  root.pathname = input.path;
  return root.toString();
}

export function isStaffOnboardingUrl(value: string, input: {
  baseUrl: string; tenantSlug: string; staffId: string; email: string;
}) {
  const expected = new URL(buildTenantAuthUrl({ ...input, path: "/reset-password" }));
  let url: URL;
  try { url = new URL(value); } catch { return false; }
  if (url.origin !== expected.origin || url.pathname !== expected.pathname || url.username || url.password || url.hash) return false;
  const keys = ["onboarding", "staffId", "email", "token"];
  if ([...url.searchParams.keys()].some((key) => !keys.includes(key)) ||
    keys.some((key) => url.searchParams.getAll(key).length !== 1)) return false;
  const token = url.searchParams.get("token");
  return url.searchParams.get("onboarding") === "1" && url.searchParams.get("staffId") === input.staffId &&
    url.searchParams.get("email") === input.email && !!token && token.length <= 256;
}
