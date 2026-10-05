import type { Prisma } from "./generated/client";
import { getPasswordRecoveryIdentity } from "./password-recovery";
import { getStaffCredentialAccount } from "./staff-login-identity";

type AuthAccessDatabase = Pick<Prisma.TransactionClient,
  "user" | "account" | "staffProfile" | "verification" | "session" | "schoolProfile">;

export async function getPasswordSignInIdentity(db: AuthAccessDatabase, email: string,
  options: { platformRoles: readonly string[] }) {
  // Recovery and password sign-in must agree on canonical identity, archived
  // credentials and staff who still require their dedicated setup proof.
  const identity = await getPasswordRecoveryIdentity(db, email) ??
    await getAccountlessPlatformIdentity(db, email, options.platformRoles);
  if (!identity) return null;
  const credential = await db.account.findFirst({ where: {
    id: identity.credentialId, userId: identity.user.id, accountId: identity.user.id,
    providerId: "credential", deletedAt: null,
  }, select: { id: true, password: true } });
  if (!credential?.password) return null;
  const user = await db.user.findFirst({ where: {
    id: identity.user.id, email: identity.user.email, saasAccountId: identity.user.saasAccountId,
    deletedAt: null, ...activeAuthAccountWhere(options.platformRoles),
  }, select: { id: true, email: true, name: true, role: true, emailVerified: true, saasAccountId: true } });
  return user ? { user, credential: { id: credential.id, password: credential.password } } : null;
}

function activeAuthAccountWhere(platformRoles: readonly string[]): Prisma.UserWhereInput {
  return { OR: [
    { tenant: { deletedAt: null, qaPurgeStartedAt: null } },
    { saasAccountId: null, role: { in: [...platformRoles], mode: "insensitive" } },
  ] };
}

async function getAccountlessPlatformIdentity(db: AuthAccessDatabase, email: string, platformRoles: readonly string[]) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail.length > 320) return null;
  const users = await db.user.findMany({ where: { deletedAt: {}, email: { equals: normalizedEmail, mode: "insensitive" } },
    select: { id: true, email: true, saasAccountId: true, deletedAt: true, role: true }, take: 2 });
  const user = users[0];
  if (users.length !== 1 || !user || user.deletedAt || user.saasAccountId !== null ||
    user.email !== normalizedEmail || !platformRoles.includes(user.role?.toUpperCase() ?? "")) return null;
  const credential = await getStaffCredentialAccount(db, user.id);
  return credential ? { user, credentialId: credential.id } : null;
}

export function getLiveAuthSessionRecords(db: Pick<AuthAccessDatabase, "session">, ids: string[],
  options: { platformRoles: readonly string[] }) {
  return db.session.findMany({ where: {
    id: { in: ids }, deletedAt: null, expiresAt: { gt: new Date() },
    user: { deletedAt: null, ...activeAuthAccountWhere(options.platformRoles) },
  }, select: { id: true, token: true, userId: true, expiresAt: true,
    user: { select: { id: true, name: true, email: true, role: true, emailVerified: true } },
  } });
}

export async function resolveParentPhoneLoginEmail(db: AuthAccessDatabase, input: {
  phone: string; tenantSlug: string;
}) {
  if (!/^\+?\d{5,20}$/.test(input.phone) || !input.tenantSlug) return null;
  const schools = await db.schoolProfile.findMany({ where: {
    subDomain: input.tenantSlug, deletedAt: null,
    account: { deletedAt: null, qaPurgeStartedAt: null },
  }, select: { accountId: true }, take: 2 });
  if (schools.length !== 1 || !schools[0]) return null;
  const users = await db.user.findMany({ where: {
    deletedAt: {}, phoneNo: input.phone, role: "Parent", saasAccountId: schools[0].accountId,
  }, select: { email: true, deletedAt: true }, take: 2 });
  const user = users[0];
  if (users.length !== 1 || !user || user.deletedAt) return null;
  return user.email;
}
