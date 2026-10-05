import { createHash } from "node:crypto";
import type { Prisma } from "./generated/client";

type VerificationDatabase = Pick<Prisma.TransactionClient, "user" | "schoolProfile" | "verification" | "session">;

function parseIdentity(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!("userId" in value) || !("email" in value) || !("accountId" in value) ||
    !("schoolId" in value) || !("tenantSlug" in value) || !("role" in value)) return null;
  const { userId, email, accountId, schoolId, tenantSlug, role } = value;
  if (typeof userId !== "string" || !userId || userId.length > 200 ||
    typeof email !== "string" || !email || email.length > 320 ||
    typeof accountId !== "string" || !accountId || accountId.length > 200 ||
    typeof schoolId !== "string" || !schoolId || schoolId.length > 200 ||
    typeof tenantSlug !== "string" || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(tenantSlug) ||
    typeof role !== "string" || !role || role.length > 100) return null;
  return { userId, email, accountId, schoolId, tenantSlug, role };
}

function proofIdentifier(token: string) {
  return `signup-email:v1:${createHash("sha256").update(token).digest("hex")}`;
}

function proofId(userId: string) {
  return `signup-email:${userId}`;
}

async function getSignupEmailIdentity(db: VerificationDatabase, input: {
  userId: string; schoolId: string; email: string;
}) {
  const users = await db.user.findMany({
    where: { deletedAt: {}, email: { equals: input.email, mode: "insensitive" } }, take: 2,
    select: { id: true, email: true, role: true, deletedAt: true, saasAccountId: true, emailVerified: true,
      tenant: { select: { deletedAt: true, qaPurgeStartedAt: true } } },
  });
  const user = users[0];
  if (users.length !== 1 || !user || user.id !== input.userId || user.deletedAt ||
    user.emailVerified || user.email !== input.email || user.email !== user.email.trim().toLowerCase() ||
    !user.role || !user.saasAccountId || !user.tenant || user.tenant.deletedAt || user.tenant.qaPurgeStartedAt) return null;
  const school = await db.schoolProfile.findFirst({
    where: { id: input.schoolId, accountId: user.saasAccountId, deletedAt: null,
      account: { deletedAt: null, qaPurgeStartedAt: null } },
    select: { id: true, subDomain: true },
  });
  if (!school) return null;
  return parseIdentity({ userId: user.id, email: user.email, role: user.role,
    accountId: user.saasAccountId, schoolId: school.id, tenantSlug: school.subDomain });
}

// Called only by the auth service inside a Serializable transaction.
export async function issueSignupEmailVerificationRecord(db: VerificationDatabase, input: {
  userId: string; schoolId: string; email: string; token: string;
}) {
  const identity = await getSignupEmailIdentity(db, input);
  if (!identity) throw new Error("Signup email verification is unavailable.");
  const data = { identifier: proofIdentifier(input.token), value: JSON.stringify(identity),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), deletedAt: null };
  await db.verification.upsert({ where: { id: proofId(identity.userId) },
    create: { id: proofId(identity.userId), ...data }, update: data });
  return identity;
}

export async function getSignupEmailVerificationRecord(db: VerificationDatabase, input: {
  token: string; tenantSlug: string;
}) {
  if (!/^[a-f0-9]{64}$/.test(input.token)) return null;
  const proofs = await db.verification.findMany({
    where: { identifier: proofIdentifier(input.token), deletedAt: null, expiresAt: { gt: new Date() } },
    take: 2, select: { id: true, value: true, expiresAt: true },
  });
  const proof = proofs[0];
  if (proofs.length !== 1 || !proof) return null;
  let value: unknown;
  try { value = JSON.parse(proof.value); } catch { return null; }
  const parsed = parseIdentity(value);
  if (!parsed || parsed.tenantSlug !== input.tenantSlug || proof.id !== proofId(parsed.userId)) return null;
  const identity = await getSignupEmailIdentity(db, parsed);
  if (!identity || JSON.stringify(identity) !== proof.value) return null;
  return { identity, proof };
}

export async function getSignupEmailVerificationDelivery(db: VerificationDatabase, input: {
  token: string; tenantSlug: string;
}) {
  const context = await getSignupEmailVerificationRecord(db, input);
  if (!context) return null;
  const school = await db.schoolProfile.findFirst({ where: {
    id: context.identity.schoolId, accountId: context.identity.accountId,
    subDomain: context.identity.tenantSlug, deletedAt: null,
    account: { deletedAt: null, qaPurgeStartedAt: null },
  }, select: { name: true } });
  return school ? { email: context.identity.email, tenantSlug: context.identity.tenantSlug, schoolName: school.name } : null;
}

// The caller supplies a verified session, never a requested recipient address.
export async function reissueSignupEmailVerificationRecord(db: VerificationDatabase, input: {
  userId: string; sessionToken: string; tenantSlug: string; token: string;
}) {
  const session = await db.session.findFirst({ where: {
    token: input.sessionToken, userId: input.userId, deletedAt: null, expiresAt: { gt: new Date() },
    user: { deletedAt: null, role: { equals: "Admin", mode: "insensitive" },
      tenant: { deletedAt: null, qaPurgeStartedAt: null } },
  }, select: { user: { select: { email: true, emailVerified: true, saasAccountId: true,
    tenant: { select: { email: true } } } } } });
  const user = session?.user;
  if (!user?.saasAccountId || user.email !== user.tenant?.email) {
    return { status: "unavailable" as const };
  }
  const schools = await db.schoolProfile.findMany({ where: {
    accountId: user.saasAccountId, subDomain: input.tenantSlug, deletedAt: null,
    account: { deletedAt: null, qaPurgeStartedAt: null },
  }, take: 2, select: { id: true } });
  if (schools.length !== 1 || !schools[0]) return { status: "unavailable" as const };
  if (user.emailVerified) return { status: "verified" as const };

  const cooldownId = `signup-email-reissue:${input.userId}`;
  const cooldown = await db.verification.findUnique({ where: { id: cooldownId }, select: { expiresAt: true } });
  if (cooldown && cooldown.expiresAt > new Date()) return { status: "cooldown" as const };
  const identity = await issueSignupEmailVerificationRecord(db, {
    userId: input.userId, schoolId: schools[0].id, email: user.email, token: input.token,
  });
  const data = { identifier: "signup-email-reissue:v1", value: input.userId,
    expiresAt: new Date(Date.now() + 60_000), deletedAt: null };
  await db.verification.upsert({ where: { id: cooldownId }, create: { id: cooldownId, ...data }, update: data });
  return { status: "issued" as const, ...identity };
}

// Exact proof consumption and identity update must commit or roll back together.
export async function completeSignupEmailVerificationRecords(db: VerificationDatabase, input: {
  token: string; tenantSlug: string;
}) {
  const context = await getSignupEmailVerificationRecord(db, input);
  if (!context) throw new Error("Signup email verification is unavailable.");
  const { identity, proof } = context;
  const consumed = await db.verification.deleteMany({ where: {
    id: proof.id, identifier: proofIdentifier(input.token), value: proof.value,
    deletedAt: null, expiresAt: { gt: new Date() },
  } });
  const updated = await db.user.updateMany({ where: {
    id: identity.userId, email: identity.email, role: identity.role,
    saasAccountId: identity.accountId, deletedAt: null,
    OR: [{ emailVerified: false }, { emailVerified: null }],
    tenant: { deletedAt: null, qaPurgeStartedAt: null, schools: { some: {
      id: identity.schoolId, subDomain: identity.tenantSlug, deletedAt: null,
    } } },
  }, data: { emailVerified: true } });
  if (consumed.count !== 1 || updated.count !== 1) throw new Error("Signup email verification is unavailable.");
  return { status: "verified" as const };
}
