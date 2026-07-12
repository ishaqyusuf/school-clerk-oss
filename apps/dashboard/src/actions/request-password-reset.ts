"use server";

import { auth } from "@/auth/server";
import { getTenantUrlHeaderNames } from "@school-clerk/tenant-url";
import { headers } from "next/headers";
import { prisma } from "@school-clerk/db";
import { ensureCredentialAccount } from "./ensure-credential-account";
import { buildDashboardTenantUrl } from "@/features/signup/tenant-urls";
import { getDashboardTenantUrlConfig } from "@/utils/tenant-url-config";

type PasswordResetUser = Awaited<
  ReturnType<typeof getPasswordResetUsers>
>[number];

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeHost(value?: string | null) {
  return (
    value
      ?.trim()
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "") ?? ""
  );
}

function normalizePath(path = "") {
  return path ? (path.startsWith("/") ? path : `/${path}`) : "";
}

function buildCustomDomainUrl(customDomain: string, path = "") {
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  return `${protocol}://${normalizeHost(customDomain)}${normalizePath(path)}`;
}

async function getCurrentOrigin() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const proto =
    requestHeaders.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");

  return `${proto}://${host}`;
}

async function getCurrentTenantSlug() {
  const requestHeaders = await headers();
  const tenantHeaderNames = getTenantUrlHeaderNames(
    getDashboardTenantUrlConfig(),
  );
  const domainHeader = requestHeaders.get(tenantHeaderNames.domain)?.trim();

  return domainHeader || null;
}

async function getPasswordResetUsers(email: string) {
  return prisma.user.findMany({
    where: {
      deletedAt: null,
      email: normalizeEmail(email),
    },
    select: {
      id: true,
      tenant: {
        select: {
          schools: {
            where: {
              deletedAt: null,
            },
            orderBy: {
              createdAt: "asc",
            },
            select: {
              subDomain: true,
              domains: {
                where: {
                  deletedAt: null,
                },
                orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
                select: {
                  subdomain: true,
                  customDomain: true,
                  isPrimary: true,
                  isVerified: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

function userBelongsToTenant(user: PasswordResetUser, tenantSlug: string) {
  return user.tenant?.schools.some((school) => {
    if (school.subDomain === tenantSlug) return true;
    return school.domains.some((domain) => domain.subdomain === tenantSlug);
  });
}

function getPreferredResetUrlForUser(user?: PasswordResetUser | null) {
  const school = user?.tenant?.schools[0];
  if (!school) return null;

  const customDomain = school.domains.find(
    (domain) => domain.customDomain && domain.isVerified,
  )?.customDomain;

  if (customDomain) {
    return buildCustomDomainUrl(customDomain, "/reset-password");
  }

  const subdomain =
    school.domains.find((domain) => domain.subdomain && domain.isPrimary)
      ?.subdomain ??
    school.domains.find((domain) => domain.subdomain)?.subdomain ??
    school.subDomain;

  if (!subdomain) return null;

  return buildDashboardTenantUrl(subdomain, "/reset-password");
}

function getPasswordResetUrl({
  currentOrigin,
  currentTenantSlug,
  users,
}: {
  currentOrigin: string;
  currentTenantSlug: string | null;
  users: PasswordResetUser[];
}) {
  const tenantUser = currentTenantSlug
    ? users.find((user) => userBelongsToTenant(user, currentTenantSlug))
    : null;
  const resetUrl = getPreferredResetUrlForUser(tenantUser ?? users[0]);

  return resetUrl ?? `${currentOrigin}/reset-password`;
}

export async function requestPasswordReset(email: string) {
  const currentOrigin = await getCurrentOrigin();
  const [currentTenantSlug, users] = await Promise.all([
    getCurrentTenantSlug(),
    getPasswordResetUsers(email),
  ]);
  const redirectTo = new URL(
    getPasswordResetUrl({
      currentOrigin,
      currentTenantSlug,
      users,
    }),
  );
  const requestHeaders = new Headers(await headers());
  requestHeaders.set("origin", redirectTo.origin);

  await Promise.all(
    users.map((user) => ensureCredentialAccount(prisma, user.id)),
  );

  return auth.api.requestPasswordReset({
    body: {
      email,
      redirectTo: redirectTo.toString(),
    },
    headers: requestHeaders,
  });
}
