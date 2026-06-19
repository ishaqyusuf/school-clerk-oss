import { buildTenantPageMetadata } from "@/utils/tenant-page-metadata";
import { TenantUrlProvider } from "@school-clerk/tenant-url/react";
import { getDashboardTenantUrlConfig } from "@/utils/tenant-url-config";
import { resolveTenantUrlContextFromHeaders } from "@school-clerk/tenant-url/next/server";
import { getTenantUrlHeaderNames } from "@school-clerk/tenant-url";
import { headers } from "next/headers";

export async function generateMetadata({ params }) {
  const { domain } = await params;
  const requestHeaders = await headers();
  const tenantUrlConfig = getDashboardTenantUrlConfig();
  const tenantHeaderNames = getTenantUrlHeaderNames(tenantUrlConfig);
  const pathname = requestHeaders.get(tenantHeaderNames.pathname);
  const host = requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ||
    (process.env.NODE_ENV === "production" ? "https" : "http");

  return buildTenantPageMetadata({
    domain,
    pathname,
    host,
    protocol,
  });
}

export default async function DomainLayout({ children, params }) {
  const { domain } = await params;

  if (process.env.NODE_ENV === "production") {
    return children;
  }

  const requestHeaders = await headers();
  const tenantUrlConfig = getDashboardTenantUrlConfig();
  const tenantUrlContext = resolveTenantUrlContextFromHeaders({
    domain,
    headers: requestHeaders,
    config: tenantUrlConfig,
  });

  return (
    <TenantUrlProvider config={tenantUrlConfig} context={tenantUrlContext}>
      {children}
    </TenantUrlProvider>
  );
}
