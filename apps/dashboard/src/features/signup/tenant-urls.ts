import {
  buildSignupUrl,
  resolveDashboardAppRootDomain,
  resolveRootHostFromCurrentHost,
  type RuntimeUrlConfig,
} from "@school-clerk/utils";

function normalizeHost(value?: string | null) {
  return value?.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "") || "";
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
  if (process.env.NODE_ENV !== "production") {
    const config = getDashboardRuntimeUrlConfig();
    return resolveDashboardAppRootDomain(
      config.portlessRootDomain ?? config.appRootDomain,
    );
  }

  const publicHost = normalizeHost(process.env.NEXT_PUBLIC_APP_URL);
  const rootDomain = normalizeHost(process.env.APP_ROOT_DOMAIN);
  const vercelRuntimeHost = normalizeHost(process.env.VERCEL_URL);
  const vercelProjectHost = normalizeHost(
    process.env.VERCEL_PROJECT_SLUG
      ? `${process.env.VERCEL_PROJECT_SLUG}.vercel.app`
      : null,
  );

  if (publicHost.includes("vercel.app")) {
    return publicHost;
  }

  if (vercelRuntimeHost.includes("vercel.app")) {
    return vercelRuntimeHost;
  }

  if (vercelProjectHost.includes("vercel.app")) {
    return vercelProjectHost;
  }

  if (rootDomain.includes("vercel.app")) {
    return rootDomain;
  }

  if (rootDomain) {
    return rootDomain;
  }

  if (publicHost) {
    return publicHost;
  }

  return "school-clerk.com";
}

export function getSignupPreviewSuffix() {
  if (process.env.NODE_ENV !== "production") {
    return getSignupHostSuffix();
  }

  const rootDomain = normalizeHost(process.env.APP_ROOT_DOMAIN);
  return rootDomain || getSignupHostSuffix();
}

export function buildTenantUrl(subdomain: string, path = "") {
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const config = getDashboardRuntimeUrlConfig();
  const rootHost = resolveRootHostFromCurrentHost(
    getSignupHostSuffix(),
    config,
  );
  const host = `${subdomain}.${rootHost}`;
  const normalizedPath = path
    ? path.startsWith("/")
      ? path
      : `/${path}`
    : "";

  return `${protocol}://${host}${normalizedPath}`;
}
