import { resolveDashboardAppRootDomain } from "@school-clerk/utils";
import type { TenantUrlConfig } from "@school-clerk/tenant-url";

export function getDashboardTenantUrlConfig(): TenantUrlConfig {
  return {
    internalPrefix: "",
    appRootDomain: resolveDashboardAppRootDomain(process.env.APP_ROOT_DOMAIN),
    projectSlug: process.env.TENANT_URL_PROJECT_SLUG ?? "school-clerk",
    pathStyleHosts: ["localhost", "127.0.0.1", "0.0.0.0"],
    enablePathStyleHosts: process.env.NODE_ENV !== "production",
    reservedPaths: ["sign-up", "login", "dev-quick-login"],
  };
}
