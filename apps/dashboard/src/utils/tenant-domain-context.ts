import { prisma } from "@school-clerk/db";

export type TenantDomainContext = {
  subdomain: string | null;
  saasAccountId: string | null;
};

export function isTenantDomainTableMissing(error: unknown) {
  const candidate = error as {
    code?: string;
    meta?: { modelName?: string };
    message?: string;
  };

  return (
    candidate?.code === "P2021" &&
    (candidate.meta?.modelName === "TenantDomain" ||
      candidate.message?.includes("TenantDomain"))
  );
}

export async function findTenantDomainBySubdomain(
  subdomain: string,
): Promise<TenantDomainContext | null> {
  try {
    return await prisma.tenantDomain.findFirst({
      where: {
        deletedAt: null,
        subdomain,
      },
      select: {
        subdomain: true,
        saasAccountId: true,
      },
    });
  } catch (error) {
    if (!isTenantDomainTableMissing(error)) {
      throw error;
    }

    const school = await prisma.schoolProfile.findFirst({
      where: {
        deletedAt: null,
        subDomain: subdomain,
      },
      select: {
        subDomain: true,
        accountId: true,
      },
    });

    return school
      ? {
          subdomain: school.subDomain,
          saasAccountId: school.accountId,
        }
      : null;
  }
}

export async function findTenantDomainByCustomDomain(
  customDomain: string,
): Promise<TenantDomainContext | null> {
  try {
    return await prisma.tenantDomain.findFirst({
      where: {
        customDomain,
        deletedAt: null,
      },
      select: {
        subdomain: true,
        saasAccountId: true,
      },
    });
  } catch (error) {
    if (isTenantDomainTableMissing(error)) {
      return null;
    }

    throw error;
  }
}
