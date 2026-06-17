import { buildTenantPageMetadata } from "@/utils/tenant-page-metadata";
import { DevTenantQuickLoginFab } from "@/components/dev-tenant-quick-login-fab";
import { TenantUrlProvider } from "@school-clerk/tenant-url/react";
import { getDashboardTenantUrlConfig } from "@/utils/tenant-url-config";
import { resolveTenantUrlContextFromHeaders } from "@school-clerk/tenant-url/next/server";
import { prisma } from "@school-clerk/db";
import {
  buildTenantHref,
  getTenantUrlHeaderNames,
} from "@school-clerk/tenant-url";
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

  const tenant = await prisma.schoolProfile.findFirst({
    where: {
      deletedAt: null,
      domains: {
        some: {
          subdomain: domain,
        },
      },
    },
    select: {
      account: {
        select: {
          users: {
            where: {
              deletedAt: null,
            },
            orderBy: {
              createdAt: "asc",
            },
            select: {
              email: true,
              name: true,
              role: true,
            },
            take: 8,
          },
        },
      },
    },
  });

  const users =
    tenant?.account?.users.map((user) => ({
      email: user.email,
      name: user.name,
      role: user.role,
      quickLoginHref: buildTenantHref(
        tenantUrlContext,
        `/dev-quick-login?email=${encodeURIComponent(
          user.email,
        )}&return_to=${encodeURIComponent("/")}`,
        tenantUrlConfig,
      ),
    })) ?? [];

  return (
    <TenantUrlProvider config={tenantUrlConfig} context={tenantUrlContext}>
      {children}
      <DevTenantQuickLoginFab domain={domain} users={users} />
    </TenantUrlProvider>
  );
}
