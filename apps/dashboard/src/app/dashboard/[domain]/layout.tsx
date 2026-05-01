import { buildTenantPageMetadata } from "@/utils/tenant-page-metadata";
import { DevTenantQuickLoginFab } from "@/components/dev-tenant-quick-login-fab";
import { prisma } from "@school-clerk/db";
import { resolveDashboardAppRootDomain } from "@school-clerk/utils";
import { headers } from "next/headers";

export async function generateMetadata({ params }) {
  const { domain } = await params;
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-school-clerk-pathname");
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

  const dashboardHost = resolveDashboardAppRootDomain(
    process.env.APP_ROOT_DOMAIN,
  );
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
      quickLoginHref: `http://${domain}.${dashboardHost}/login?email=${encodeURIComponent(user.email)}&password=${encodeURIComponent("lorem-ipsum")}&return_to=${encodeURIComponent("/dashboard")}`,
    })) ?? [];

  return (
    <>
      {children}
      <DevTenantQuickLoginFab domain={domain} users={users} />
    </>
  );
}
