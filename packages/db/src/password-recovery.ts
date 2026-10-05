import type { DatabaseTransaction } from "./prisma";
import type { Prisma } from "./generated/client";
import { createHash } from "node:crypto";
import { getStaffCredentialAccount } from "./staff-login-identity";

type RecoveryDatabase = Pick<DatabaseTransaction, "user" | "account" | "staffProfile" | "verification" | "session">;

function recoveryProofPrefix(userId: string) {
  return `password-recovery:v1:${userId}:`;
}

function recoveryProofIdentifier(userId: string, token: string) {
  return `${recoveryProofPrefix(userId)}${createHash("sha256").update(token).digest("hex")}`;
}

export async function bindPasswordRecoveryToken(db: RecoveryDatabase, input: { userId: string; email: string; token: string }) {
  const identity = await getPasswordRecoveryIdentity(db, input.email);
  if (!identity || identity.user.id !== input.userId) return null;
  const token = await db.verification.findFirst({ where: {
    identifier: `reset-password:${input.token}`, value: input.userId, deletedAt: null, expiresAt: { gt: new Date() },
  }, select: { expiresAt: true } });
  if (!token) return null;
  await db.verification.create({ data: {
    identifier: recoveryProofIdentifier(input.userId, input.token), expiresAt: token.expiresAt,
    value: JSON.stringify({ userId: input.userId, email: identity.user.email,
      accountId: identity.user.saasAccountId, credentialId: identity.credentialId }),
  } });
  return identity;
}

export async function getPasswordRecoveryIdentity(db: RecoveryDatabase, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail.length > 320) return null;
  const users = await db.user.findMany({
    where: { deletedAt: {}, email: { equals: normalizedEmail, mode: "insensitive" } }, take: 2,
    select: { id: true, name: true, email: true, deletedAt: true, saasAccountId: true,
      tenant: { select: { id: true, deletedAt: true, qaPurgeStartedAt: true,
        schools: { where: { deletedAt: null }, orderBy: { createdAt: "asc" }, select: {
          name: true, subDomain: true, domains: { where: { deletedAt: null, isVerified: true },
            select: { subdomain: true, customDomain: true } },
        } } } } },
  });
  const user = users[0];
  if (users.length !== 1 || !user || user.deletedAt || user.email !== normalizedEmail ||
    !user.tenant || user.tenant.deletedAt || user.tenant.qaPurgeStartedAt) return null;
  const [credential, pendingStaff] = await Promise.all([
    getStaffCredentialAccount(db, user.id),
    db.staffProfile.findFirst({ where: { deletedAt: null,
      email: { equals: normalizedEmail, mode: "insensitive" },
      schoolProfile: { accountId: user.tenant.id }, onboardedAt: null,
    }, select: { id: true } }),
  ]);
  if (!credential || pendingStaff) return null;
  return { user, credentialId: credential.id };
}

export async function getPasswordRecoveryToken(db: RecoveryDatabase, token: string) {
  if (!token || token.length > 256 || token !== token.trim()) return null;
  const records = await db.verification.findMany({
    where: { identifier: `reset-password:${token}`, deletedAt: null }, take: 2,
    select: { id: true, value: true, expiresAt: true },
  });
  const verification = records[0];
  if (records.length !== 1 || !verification || verification.expiresAt <= new Date()) return null;
  const user = await db.user.findFirst({ where: { id: verification.value, deletedAt: null }, select: { email: true } });
  if (!user) return null;
  const identity = await getPasswordRecoveryIdentity(db, user.email);
  if (!identity || identity.user.id !== verification.value) return null;
  const proofs = await db.verification.findMany({ where: {
    identifier: recoveryProofIdentifier(identity.user.id, token), deletedAt: null, expiresAt: { gt: new Date() },
  }, select: { id: true, value: true, expiresAt: true }, take: 2 });
  const proof = proofs[0];
  if (proofs.length !== 1 || !proof || proof.value !== JSON.stringify({ userId: identity.user.id,
    email: identity.user.email, accountId: identity.user.saasAccountId, credentialId: identity.credentialId })) return null;
  return { ...identity, verification, proof };
}

export async function completePasswordRecoveryRecords(db: RecoveryDatabase,
  context: NonNullable<Awaited<ReturnType<typeof getPasswordRecoveryToken>>>,
  input: { token: string; passwordHash: string }) {
  const consumedProof = await db.verification.deleteMany({ where: {
    id: context.proof.id, value: context.proof.value,
    identifier: recoveryProofIdentifier(context.user.id, input.token), deletedAt: null, expiresAt: { gt: new Date() },
  } });
  const consumed = await db.verification.deleteMany({ where: {
    id: context.verification.id, identifier: `reset-password:${input.token}`,
    value: context.user.id, deletedAt: null, expiresAt: { gt: new Date() },
  } });
  if (consumedProof.count !== 1 || context.proof.expiresAt <= new Date() ||
    consumed.count !== 1 || context.verification.expiresAt <= new Date()) {
    throw new Error("Invalid or unavailable reset token.");
  }
  const credential = await db.account.updateMany({ where: {
    id: context.credentialId, userId: context.user.id, accountId: context.user.id,
    providerId: "credential", deletedAt: null,
  }, data: { password: input.passwordHash } });
  const user = await db.user.updateMany({ where: {
    id: context.user.id, email: context.user.email, saasAccountId: context.user.saasAccountId, deletedAt: null,
    tenant: { deletedAt: null, qaPurgeStartedAt: null },
  }, data: { password: null } });
  if (credential.count !== 1 || user.count !== 1) throw new Error("Account access changed. Request a new reset link.");
  await db.verification.deleteMany({ where: { identifier: { startsWith: recoveryProofPrefix(context.user.id) } } });
  await db.session.updateMany({ where: { userId: context.user.id, deletedAt: null }, data: { deletedAt: new Date() } });
  return { status: true as const };
}
