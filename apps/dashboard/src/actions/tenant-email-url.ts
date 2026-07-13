import "server-only";

import { buildTenantAppUrl } from "@school-clerk/tenant-url";
import { resolveDashboardAppRootDomain } from "@school-clerk/utils";
import { headers } from "next/headers";
import { networkInterfaces } from "node:os";

function getHostPort(host: string) {
  if (host.startsWith("[")) return host.match(/]:(\d+)$/)?.[1] ?? "";
  return host.match(/:(\d+)$/)?.[1] ?? "";
}

function normalizeHost(value?: string | null) {
  return value?.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "") ?? "";
}

function getPreferredNetworkIp() {
  const addresses = Object.values(networkInterfaces())
    .flat()
    .filter(
      (
        address,
      ): address is NonNullable<
        ReturnType<typeof networkInterfaces>[string]
      >[number] =>
        Boolean(address) &&
        address.family === "IPv4" &&
        !address.internal &&
        /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
          address.address,
        ),
    )
    .map((address) => address.address);

  return (
    addresses.find((address) => address.startsWith("10.")) ?? addresses[0] ?? ""
  );
}

function getDevelopmentEmailHost(requestHost: string) {
  const explicitHost = normalizeHost(
    process.env.DEV_EMAIL_LINK_HOST ??
      process.env.DEV_NETWORK_HOST ??
      process.env.NEXT_PUBLIC_DEV_NETWORK_HOST,
  );

  if (explicitHost) return explicitHost;

  const normalizedRequestHost = normalizeHost(requestHost);
  const bareHost = normalizedRequestHost.replace(/:\d+$/, "");

  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(bareHost)) {
    return normalizedRequestHost;
  }

  if (bareHost === "localhost" || bareHost.endsWith(".localhost")) {
    return getPreferredNetworkIp();
  }

  return "";
}

export async function getTenantDashboardEmailUrl({
  path,
  tenantSlug,
}: {
  path: string;
  tenantSlug: string;
}) {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const proto =
    requestHeaders.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");

  if (process.env.NODE_ENV === "development") {
    const developmentHost = getDevelopmentEmailHost(host);

    if (developmentHost) {
      return buildTenantAppUrl({
        tenantSlug,
        path,
        currentHost: developmentHost,
        currentProtocol: "http",
        targetRootDomain: resolveDashboardAppRootDomain(
          process.env.APP_ROOT_DOMAIN,
        ),
        targetPort:
          getHostPort(host) ||
          process.env.PORTLESS_APP_PORT ||
          process.env.DASHBOARD_PORT ||
          process.env.PORT ||
          "2200",
      });
    }
  }

  return `${proto}://${host}${path}`;
}
