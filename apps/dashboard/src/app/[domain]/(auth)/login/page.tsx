import { buildTenantPageMetadata } from "@/utils/tenant-page-metadata";
import { prisma } from "@school-clerk/db";
import { headers } from "next/headers";
import { buildDashboardSignupUrl } from "@/features/signup/tenant-urls";
import { ensureCredentialAccount } from "@/actions/ensure-credential-account";
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
      staffProfiles: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          email: true,
          onboardedAt: true,
        },
      },
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
              id: true,
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

  const quickLoginUsers =
    process.env.NODE_ENV === "production"
      ? []
      : await Promise.all(
          (tenant?.account?.users ?? []).map(async (user) => {
            const staff = tenant?.staffProfiles?.find(
              (s) => s.email === user.email,
            );
            const isOnboarded =
              user.role === "ADMIN" || !staff || staff.onboardedAt !== null;

            let token = "";
            if (!isOnboarded) {
              token = crypto.randomUUID();
              const identifier = `reset-password:${token}`;
              await ensureCredentialAccount(prisma, user.id);
              await prisma.verification.deleteMany({
                where: {
                  identifier: {
                    startsWith: "reset-password:",
                  },
                  value: user.id,
                },
              });
              await prisma.verification.create({
                data: {
                  identifier,
                  value: user.id,
                  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
                },
              });
            }

            return {
              email: user.email,
              name: user.name,
              role: user.role,
              isOnboarded,
              staffId: staff?.id,
              token,
            };
          }),
        );

  return (
    <Client
      schoolName={tenant?.name ?? domain}
      signupHref={signupHref}
      quickLoginUsers={quickLoginUsers}
    />
  );
}
