import { resolveDashboardAppRootDomain } from "@school-clerk/utils";
import type { TenantUrlConfig } from "@school-clerk/tenant-url";

const defaultDevUrlVariantHosts = [
  "localhost",
  "127.0.0.1",
  "192.168.18.5",
  "10.31.248.73",
];

function withPort(host: string, port: string) {
  return /:\d+$/.test(host) ? host : `${host}:${port}`;
}

function getDevUrlVariantPathHosts() {
  if (process.env.NODE_ENV === "production") return [];

  const port =
    process.env.PORTLESS_APP_PORT ||
    process.env.DASHBOARD_PORT ||
    process.env.PORT ||
    "2200";
  const hosts =
    process.env.DASHBOARD_DEV_URL_VARIANT_HOSTS?.split(",")
      .map((host) => host.trim())
      .filter(Boolean) ?? defaultDevUrlVariantHosts;

  return hosts.map((host) => withPort(host, port));
}

export function getDashboardTenantUrlConfig(): TenantUrlConfig {
  return {
    internalPrefix: "",
    appRootDomain: resolveDashboardAppRootDomain(process.env.APP_ROOT_DOMAIN),
    additionalRootDomains:
      process.env.NODE_ENV !== "production" ? ["school-clerk.localhost"] : [],
    urlVariantPathHosts: getDevUrlVariantPathHosts(),
    projectSlug: process.env.TENANT_URL_PROJECT_SLUG ?? "school-clerk",
    pathStyleHosts: ["localhost", "127.0.0.1", "0.0.0.0"],
    enablePathStyleHosts: process.env.NODE_ENV !== "production",
    reservedPaths: ["sign-up", "login"],
  };
}
