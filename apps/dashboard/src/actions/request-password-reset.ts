"use server";

import { auth } from "@/auth/server";
import { getTenantUrlHeaderNames } from "@school-clerk/tenant-url";
import { headers } from "next/headers";
import { prisma } from "@school-clerk/db";
import { ensureCredentialAccount } from "./ensure-credential-account";
import { getDashboardTenantUrlConfig } from "@/utils/tenant-url-config";
import { getTenantDashboardEmailUrl } from "./tenant-email-url";

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
              name: true,
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

function schoolMatchesTenant(
  school: NonNullable<PasswordResetUser["tenant"]>["schools"][number],
  tenantSlug: string,
) {
  const normalizedTenant = normalizeHost(tenantSlug);

  if (school.subDomain === normalizedTenant) return true;
  return school.domains.some((domain) => {
    if (domain.subdomain === normalizedTenant) return true;
    return (
      domain.customDomain &&
      normalizeHost(domain.customDomain) === normalizedTenant
    );
  });
}

function userBelongsToTenant(user: PasswordResetUser, tenantSlug: string) {
  return user.tenant?.schools.some((school) => {
    return schoolMatchesTenant(school, tenantSlug);
  });
}

async function getPreferredResetTargetForUser({
  currentTenantSlug,
  user,
}: {
  currentTenantSlug: string | null;
  user?: PasswordResetUser | null;
}) {
  const school =
    (currentTenantSlug
      ? user?.tenant?.schools.find((candidate) =>
          schoolMatchesTenant(candidate, currentTenantSlug),
        )
      : null) ??
    user?.tenant?.schools[0] ??
    null;

  if (!school) return null;

  const customDomain = school.domains.find(
    (domain) => domain.customDomain && domain.isVerified,
  )?.customDomain;

  if (customDomain) {
    return {
      schoolName: school.name,
      url: buildCustomDomainUrl(customDomain, "/reset-password"),
    };
  }

  const subdomain =
    school.domains.find((domain) => domain.subdomain && domain.isPrimary)
      ?.subdomain ??
    school.domains.find((domain) => domain.subdomain)?.subdomain ??
    school.subDomain;

  if (!subdomain) return null;

  return {
    schoolName: school.name,
    url: await getTenantDashboardEmailUrl({
      path: "/reset-password",
      tenantSlug: subdomain,
    }),
  };
}

async function getPasswordResetTarget({
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
  const resetTarget = await getPreferredResetTargetForUser({
    currentTenantSlug,
    user: tenantUser ?? users[0],
  });

  return (
    resetTarget ?? {
      schoolName: null,
      url: `${currentOrigin}/reset-password`,
    }
  );
}

function getPreferredPasswordResetUser({
  currentTenantSlug,
  users,
}: {
  currentTenantSlug: string | null;
  users: PasswordResetUser[];
}) {
  return (
    (currentTenantSlug
      ? users.find((user) => userBelongsToTenant(user, currentTenantSlug))
      : null) ??
    users[0] ??
    null
  );
}

async function createLocalPasswordResetUrl({
  email,
  resetTargetUrl,
  userId,
}: {
  email: string;
  resetTargetUrl: string;
  userId: string;
}) {
  const token = crypto.randomUUID();

  await prisma.verification.create({
    data: {
      identifier: `reset-password:${token}`,
      value: userId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  const resetUrl = new URL(resetTargetUrl);
  resetUrl.searchParams.set("token", token);
  resetUrl.searchParams.set("email", email);

  return resetUrl.toString();
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const currentOrigin = await getCurrentOrigin();
  const [currentTenantSlug, users] = await Promise.all([
    getCurrentTenantSlug(),
    getPasswordResetUsers(normalizedEmail),
  ]);
  const resetTarget = await getPasswordResetTarget({
    currentOrigin,
    currentTenantSlug,
    users,
  });

  if (process.env.NODE_ENV !== "production") {
    const resetUser = getPreferredPasswordResetUser({
      currentTenantSlug,
      users,
    });

    if (!resetUser) {
      return { redirectTo: null };
    }

    await ensureCredentialAccount(prisma, resetUser.id);

    return {
      redirectTo: await createLocalPasswordResetUrl({
        email: normalizedEmail,
        resetTargetUrl: resetTarget.url,
        userId: resetUser.id,
      }),
    };
  }

  const redirectTo = new URL(resetTarget.url);
  const requestHeaders = new Headers(await headers());
  requestHeaders.set("origin", redirectTo.origin);
  if (resetTarget.schoolName) {
    requestHeaders.set(
      "x-school-clerk-school-name",
      encodeURIComponent(resetTarget.schoolName),
    );
  }

  await Promise.all(
    users.map((user) => ensureCredentialAccount(prisma, user.id)),
  );

  await auth.api.requestPasswordReset({
    body: {
      email: normalizedEmail,
      redirectTo: redirectTo.toString(),
    },
    headers: requestHeaders,
  });

  return { redirectTo: null };
}
