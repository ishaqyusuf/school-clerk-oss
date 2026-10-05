import "server-only";
import { getActiveAuthTenantDomain, getVerifiedAuthCustomDomain, prisma } from "@school-clerk/db";

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
  return getActiveAuthTenantDomain(prisma, subdomain);
}

export async function findTenantDomainByCustomDomain(
  customDomain: string,
): Promise<TenantDomainContext | null> {
  try {
    return await getVerifiedAuthCustomDomain(prisma, customDomain);
  } catch (error) {
    if (isTenantDomainTableMissing(error)) {
      return null;
    }

    throw error;
  }
}
