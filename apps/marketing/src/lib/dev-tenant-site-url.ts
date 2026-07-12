import { buildTenantAppUrl } from "@school-clerk/tenant-url";

const pathStyleHosts = ["localhost", "127.0.0.1", "0.0.0.0"];

function parseOriginLike(value?: string | null) {
  if (!value) return null;

  try {
    return new URL(value.includes("://") ? value : `http://${value}`);
  } catch {
    return null;
  }
}

export function getPortlessCurrentOrigin(currentOrigin?: string) {
  if (!currentOrigin) return undefined;

  try {
    const url = new URL(currentOrigin);
    const isLocalHost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "0.0.0.0" ||
      url.hostname.endsWith(".localhost");

    if (isLocalHost) {
      url.protocol = "http:";
    }

    if (url.hostname.endsWith(".localhost")) {
      url.port = "";
      return url.origin;
    }
  } catch {
    return currentOrigin;
  }

  return currentOrigin;
}

export function buildDevTenantSiteUrl(input: {
  currentOrigin?: string;
  pathname?: string;
  sitePort?: number | string | null;
  siteRootDomain: string;
  tenantSlug: string;
}) {
  const parsedOrigin = parseOriginLike(input.currentOrigin);

  return buildTenantAppUrl({
    tenantSlug: input.tenantSlug,
    path: input.pathname ?? "/",
    currentHost: parsedOrigin?.host ?? input.currentOrigin,
    currentProtocol: parsedOrigin?.protocol,
    targetRootDomain: input.siteRootDomain,
    targetPort: input.sitePort,
    pathStyleHosts,
    enablePathStyleHosts: process.env.NODE_ENV !== "production",
    defaultProtocol: process.env.NODE_ENV === "production" ? "https" : "http",
  });
}

export function buildDevTenantDashboardUrl(input: {
  currentOrigin?: string;
  dashboardPort?: number | string | null;
  dashboardRootDomain: string;
  pathname?: string;
  tenantSlug: string;
}) {
  const parsedOrigin = parseOriginLike(input.currentOrigin);

  return buildTenantAppUrl({
    tenantSlug: input.tenantSlug,
    path: input.pathname ?? "/",
    currentHost: parsedOrigin?.host ?? input.currentOrigin,
    currentProtocol: parsedOrigin?.protocol,
    targetRootDomain: input.dashboardRootDomain,
    targetPort: input.dashboardPort,
    pathStyleHosts,
    enablePathStyleHosts: process.env.NODE_ENV !== "production",
    defaultProtocol: process.env.NODE_ENV === "production" ? "https" : "http",
  });
}
