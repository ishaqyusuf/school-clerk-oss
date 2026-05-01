import { buildTenantPageMetadata } from "@/utils/tenant-page-metadata";
import { prisma } from "@school-clerk/db";
import { headers } from "next/headers";
import { buildDashboardSignupUrl } from "@/features/signup/tenant-urls";
import { Client } from "./client";

export async function generateMetadata({ params }) {
  const { domain } = await params;
  return buildTenantPageMetadata({
    domain,
    pathname: "/login",
    noIndex: true,
  });
}
export default async function Page({ params }) {
  const { domain } = await params;
  const requestHeaders = await headers();
  const signupHref = buildDashboardSignupUrl({
    currentHost: requestHeaders.get("host"),
    currentProtocol: requestHeaders.get("x-forwarded-proto"),
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
      name: true,
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

  return (
    <Client
      schoolName={tenant?.name ?? domain}
      signupHref={signupHref}
      quickLoginUsers={
        process.env.NODE_ENV === "production"
          ? []
          : (tenant?.account?.users.map((user) => ({
              email: user.email,
              name: user.name,
              role: user.role,
            })) ?? [])
      }
    />
  );
}
