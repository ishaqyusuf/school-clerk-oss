import "server-only";

import { buildTenantAuthUrl, resolveAuthConfiguration } from "@school-clerk/utils/auth-url";

export async function getTenantDashboardEmailUrl(input: {
  path: "/reset-password" | "/verify-email";
  tenantSlug: string;
}) {
  const configuration = resolveAuthConfiguration({
    nodeEnv: process.env.NODE_ENV,
    authUrl: process.env.BETTER_AUTH_URL,
    dashboardUrl: process.env.DASHBOARD_APP_URL,
    publicAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    appRootDomain: process.env.APP_ROOT_DOMAIN,
  });
  return buildTenantAuthUrl({ ...input, baseUrl: configuration.baseUrl });
}
