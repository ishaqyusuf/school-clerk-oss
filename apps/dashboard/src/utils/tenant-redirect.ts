import { createTenantRedirect } from "@school-clerk/tenant-url/next/server";
import { getDashboardTenantUrlConfig } from "./tenant-url-config";

export const tenantRedirect = createTenantRedirect({
  getConfig: getDashboardTenantUrlConfig,
  isEnabled: () => process.env.NODE_ENV !== "production",
});
