import {
  buildSignupUrl,
  resolveDashboardAppRootDomain,
  resolveRootHostFromCurrentHost,
  type RuntimeUrlConfig,
} from "@school-clerk/utils";

function normalizeHost(value?: string | null) {
  return value?.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "") || "";
}

function stripDashboardHostPrefix(host: string) {
  return host.startsWith("dashboard.") ? host.slice("dashboard.".length) : host;
}

export function getSchoolSiteRootDomain() {
  const explicitRoot = normalizeHost(
    process.env.SCHOOL_SITE_ROOT_DOMAIN ?? process.env.APP_ROOT_DOMAIN,
  );

  if (explicitRoot) {
    return stripDashboardHostPrefix(explicitRoot);
  }

  const publicHost = normalizeHost(process.env.NEXT_PUBLIC_APP_URL);
  if (publicHost) {
    return stripDashboardHostPrefix(publicHost);
  }

  return "school-clerk.com";
}

export function getDashboardRuntimeUrlConfig(): RuntimeUrlConfig {
  const appRootDomain =
    process.env.DASHBOARD_ROOT_DOMAIN ?? process.env.APP_ROOT_DOMAIN;
  const productionRootDomain =
    process.env.DASHBOARD_PRODUCTION_ROOT_DOMAIN ??
    process.env.NEXT_PUBLIC_APP_URL;

  return {
    appPort: process.env.DASHBOARD_PORT ?? process.env.PORT ?? 2200,
    appRootDomain,
    portlessRootDomain:
      process.env.DASHBOARD_PORTLESS_ROOT_DOMAIN ?? appRootDomain,
    productionRootDomain,
    publicUrl: process.env.DASHBOARD_PUBLIC_URL ?? process.env.NEXT_PUBLIC_URL,
    defaultProtocol: process.env.NODE_ENV === "production" ? "https" : "http",
    isProduction: process.env.NODE_ENV === "production",
  };
}

export function buildDashboardSignupUrl(options?: {
  currentHost?: string | null;
  currentProtocol?: string | null;
  currentUrl?: string | null;
}) {
  return buildSignupUrl({
    ...options,
    config: getDashboardRuntimeUrlConfig(),
    path: process.env.DASHBOARD_SIGNUP_PATH ?? "/sign-up",
  });
}

export function getSignupHostSuffix() {
  return getSchoolSiteRootDomain();
}

export function getSignupPreviewSuffix() {
  if (process.env.NODE_ENV !== "production") {
    return getSignupHostSuffix();
  }

  return getSchoolSiteRootDomain();
}

function normalizePath(path = "") {
  return path ? (path.startsWith("/") ? path : `/${path}`) : "";
}

export function buildSchoolSiteUrl(subdomain: string, path = "") {
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const rootHost = getSchoolSiteRootDomain();
  const host = `${subdomain}.${rootHost}`;

  return `${protocol}://${host}${normalizePath(path)}`;
}

export function buildDashboardTenantUrl(subdomain: string, path = "") {
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  if (process.env.NODE_ENV === "production") {
    const host = `dashboard.${subdomain}.${getSchoolSiteRootDomain()}`;
    return `${protocol}://${host}${normalizePath(path)}`;
  }

  const config = getDashboardRuntimeUrlConfig();
  const rootHost = resolveRootHostFromCurrentHost(
    resolveDashboardAppRootDomain(
      config.portlessRootDomain ?? config.appRootDomain,
    ),
    config,
  );

  return `${protocol}://${subdomain}.${rootHost}${normalizePath(path)}`;
}
