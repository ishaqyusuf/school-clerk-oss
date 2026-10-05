import type { Prisma } from "./generated/client";

type OriginDatabase = Pick<Prisma.TransactionClient, "schoolProfile" | "tenantDomain">;

export async function getActiveAuthTenantDomain(db: OriginDatabase, slug: string) {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) return null;
  const schools = await db.schoolProfile.findMany({
    where: { subDomain: slug, deletedAt: null, account: { deletedAt: null, qaPurgeStartedAt: null } },
    select: { id: true, subDomain: true, accountId: true }, take: 2,
  });
  const school = schools[0];
  return schools.length === 1 && school
    ? { schoolProfileId: school.id, subdomain: school.subDomain, saasAccountId: school.accountId } : null;
}

export async function getVerifiedAuthCustomDomain(db: OriginDatabase, hostname: string) {
  if (!hostname || hostname.length > 253 || hostname !== hostname.trim().toLowerCase()) return null;
  try {
    const parsed = new URL(`https://${hostname}`);
    if (parsed.hostname !== hostname || parsed.host !== hostname || parsed.pathname !== "/" ||
      parsed.username || parsed.password || parsed.search || parsed.hash || hostname.endsWith(".")) return null;
  } catch {
    return null;
  }
  const domains = await db.tenantDomain.findMany({
    where: { customDomain: hostname, isVerified: true, deletedAt: null,
      schoolProfile: { deletedAt: null, account: { deletedAt: null, qaPurgeStartedAt: null } },
      saasAccount: { deletedAt: null, qaPurgeStartedAt: null } },
    select: { subdomain: true, saasAccountId: true,
      schoolProfile: { select: { id: true, subDomain: true, accountId: true } } }, take: 2,
  });
  const domain = domains[0];
  const school = domain?.schoolProfile;
  if (domains.length !== 1 || !domain?.saasAccountId || !school || school.accountId !== domain.saasAccountId ||
    (domain.subdomain !== null && domain.subdomain !== school.subDomain) ||
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(school.subDomain)) return null;
  return { schoolProfileId: school.id, subdomain: school.subDomain, saasAccountId: school.accountId };
}

export async function hasActiveAuthTenantSlug(db: OriginDatabase, slug: string) {
  return (await getActiveAuthTenantDomain(db, slug)) !== null;
}

export async function hasVerifiedAuthCustomDomain(db: OriginDatabase, hostname: string) {
  return (await getVerifiedAuthCustomDomain(db, hostname)) !== null;
}
