import type { DatabaseTransaction } from "./prisma";
import { createHash } from "node:crypto";
import type { Prisma } from "./generated/client";
import { getStaffCredentialAccount, getStaffInvitationIdentity } from "./staff-login-identity";

type StaffProof = {
  staffId: string; userId: string; schoolId: string; accountId: string;
  email: string; role: string;
};
type OnboardingDatabase = Pick<DatabaseTransaction,
  "verification" | "staffProfile" | "user" | "account" | "session">;

export function staffOnboardingIdentifier(token: string) {
  return `staff-onboarding:v1:${createHash("sha256").update(token).digest("hex")}`;
}

export function staffPasswordSetupIdentifier(token: string) {
  return `staff-password-setup:${createHash("sha256").update(token).digest("hex")}`;
}

// Hold this conditional row write inside the caller's transaction through its
// side effect. A competing issuance/consumption must acquire the same row lock.
export async function lockStaffOnboardingProof(db: Pick<DatabaseTransaction, "verification">,
  input: { staffId: string; token: string }) {
  const locked = await db.verification.updateMany({
    where: { id: `staff-onboarding:${input.staffId}`, identifier: staffOnboardingIdentifier(input.token),
      deletedAt: null, expiresAt: { gt: new Date() } },
    data: { updatedAt: new Date() },
  });
  return locked.count === 1;
}

export function createStaffOnboardingProof(db: Pick<DatabaseTransaction, "verification">,
  proof: StaffProof, token: string, expiresAt: Date) {
  const id = `staff-onboarding:${proof.staffId}`;
  const data = { identifier: staffOnboardingIdentifier(token), value: JSON.stringify(proof), expiresAt, deletedAt: null };
  return db.verification.upsert({ where: { id }, create: { id, ...data }, update: data });
}

export async function getStaffOnboardingContext(db: OnboardingDatabase, input: {
  token: string; staffId: string; email: string;
}) {
  const proof = await db.verification.findFirst({
    where: { id: `staff-onboarding:${input.staffId}`, identifier: staffOnboardingIdentifier(input.token),
      deletedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!proof) return null;
  let raw: unknown;
  try { raw = JSON.parse(proof.value); } catch { return null; }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const fields = ["staffId", "userId", "schoolId", "accountId", "email", "role"] as const;
  if (fields.some((field) => typeof record[field] !== "string" || !record[field])) return null;
  const binding = record as StaffProof;
  if (binding.staffId !== input.staffId || binding.email !== input.email) return null;
  const [staff, identity, reset, credential] = await Promise.all([
    db.staffProfile.findFirst({
      where: { id: binding.staffId, schoolProfileId: binding.schoolId, email: binding.email,
        deletedAt: null, onboardedAt: null, schoolProfile: { accountId: binding.accountId, deletedAt: null,
          account: { deletedAt: null, qaPurgeStartedAt: null } } },
      select: { id: true, name: true, schoolProfile: { select: { moduleConfiguration: { select: {
        version: true, revision: true, enabledModules: true, entitledModules: true,
      } } } } },
    }),
    getStaffInvitationIdentity(db, binding),
    db.verification.findFirst({ where: { identifier: staffPasswordSetupIdentifier(input.token), value: binding.userId,
      deletedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, identifier: true, expiresAt: true } }),
    getStaffCredentialAccount(db, binding.userId),
  ]);
  if (!staff || !identity || identity.user.id !== binding.userId || identity.email !== binding.email ||
    identity.user.role !== binding.role || !reset || !credential) return null;
  return { binding, proof, staff, user: identity.user, reset, credentialId: credential.id };
}

export async function completeStaffOnboardingRecords(db: OnboardingDatabase,
  context: NonNullable<Awaited<ReturnType<typeof getStaffOnboardingContext>>>,
  input: { passwordHash: string; name: string; title?: string; phone?: string; phone2?: string; address?: string }) {
  const { binding, proof, reset } = context;
  const consumedProof = await db.verification.deleteMany({ where: {
    id: proof.id, identifier: proof.identifier, value: proof.value, deletedAt: null, expiresAt: { gt: new Date() },
  } });
  const consumedReset = await db.verification.deleteMany({ where: {
    id: reset.id, identifier: reset.identifier, value: binding.userId, deletedAt: null, expiresAt: { gt: new Date() },
  } });
  if (consumedProof.count !== 1 || consumedReset.count !== 1 || proof.expiresAt <= new Date() || reset.expiresAt <= new Date()) {
    throw new Error("This staff invitation is no longer available. Request a new invitation.");
  }
  const credential = await db.account.updateMany({ where: { id: context.credentialId,
    userId: binding.userId, accountId: binding.userId, providerId: "credential", deletedAt: null }, data: { password: input.passwordHash } });
  const staff = await db.staffProfile.updateMany({ where: { id: binding.staffId, schoolProfileId: binding.schoolId,
    email: binding.email, deletedAt: null, onboardedAt: null }, data: {
      name: input.name, title: input.title, phone: input.phone, phone2: input.phone2, address: input.address,
      inviteStatus: "ACTIVE", onboardedAt: new Date(), lastInviteError: null,
    } });
  const user = await db.user.updateMany({ where: { id: binding.userId, saasAccountId: binding.accountId,
    email: binding.email, role: binding.role, deletedAt: null }, data: { name: input.name, emailVerified: true } });
  if (credential.count !== 1 || staff.count !== 1 || user.count !== 1) {
    throw new Error("The staff invitation changed. Request a new invitation.");
  }
  await db.session.updateMany({ where: { userId: binding.userId, deletedAt: null }, data: { deletedAt: new Date() } });
  return { staffId: binding.staffId, completed: true as const };
}
