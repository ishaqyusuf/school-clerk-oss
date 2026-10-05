import type { DatabaseTransaction } from "./prisma";
import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "./generated/client";
import { staffOnboardingIdentifier, staffPasswordSetupIdentifier } from "./staff-onboarding";
import { getStaffCredentialAccount, getStaffInvitationIdentity } from "./staff-login-identity";

const namespace = "staff-invitation-delivery:v1:";
type InvitationBinding = {
  schoolId: string; accountId: string; staffId: string; userId: string;
  actorUserId: string; email: string; role: string; tenantSlug: string; urlDigest: string;
};
type InvitationDatabase = Pick<DatabaseTransaction,
  "verification" | "schoolProfile" | "staffProfile" | "user" | "account" | "notificationPreference">;

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function createStaffInvitationDelivery(db: Pick<DatabaseTransaction, "verification">,
  input: Omit<InvitationBinding, "urlDigest"> & { ctaHref: string; expiresAt: Date }) {
  const { ctaHref, expiresAt, ...binding } = input;
  const receipt = await db.verification.create({
    data: { identifier: `${namespace}${randomUUID()}`,
      value: JSON.stringify({ ...binding, urlDigest: digest(ctaHref) }), expiresAt },
    select: { id: true },
  });
  return receipt.id;
}

export async function getStaffInvitationDelivery(db: InvitationDatabase, input: { deliveryId: string; ctaHref: string }) {
  const receipt = await db.verification.findFirst({
    where: { id: input.deliveryId, identifier: { startsWith: namespace }, deletedAt: null, expiresAt: { gt: new Date() } },
    select: { value: true },
  });
  if (!receipt) return null;
  let raw: unknown;
  try { raw = JSON.parse(receipt.value); } catch { return null; }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const fields = ["schoolId", "accountId", "staffId", "userId", "actorUserId", "email", "role", "tenantSlug", "urlDigest"] as const;
  if (fields.some((field) => typeof record[field] !== "string" || !record[field])) return null;
  const binding = record as InvitationBinding;
  if (binding.urlDigest !== digest(input.ctaHref)) return null;
  let url: URL;
  try { url = new URL(input.ctaHref); } catch { return null; }
  const token = url.searchParams.get("token");
  if (!token || url.searchParams.get("staffId") !== binding.staffId ||
    url.searchParams.get("email") !== binding.email || url.searchParams.get("onboarding") !== "1") return null;
  const activeProof = await db.verification.findFirst({ where: {
    id: `staff-onboarding:${binding.staffId}`, identifier: staffOnboardingIdentifier(token),
    deletedAt: null, expiresAt: { gt: new Date() },
  }, select: { id: true } });
  if (!activeProof) return null;
  const [school, actor, identity, credential, reset, preference] = await Promise.all([
    db.schoolProfile.findFirst({
      where: { id: binding.schoolId, accountId: binding.accountId, deletedAt: null,
        account: { deletedAt: null, qaPurgeStartedAt: null } },
      select: { id: true, name: true, subDomain: true, moduleConfiguration: { select: {
        version: true, revision: true, enabledModules: true, entitledModules: true,
      } } },
    }),
    db.user.findFirst({ where: { id: binding.actorUserId, saasAccountId: binding.accountId,
      deletedAt: null, role: { in: ["Admin", "ADMIN"] } }, select: { name: true } }),
    getStaffInvitationIdentity(db, binding),
    getStaffCredentialAccount(db, binding.userId),
    db.verification.findFirst({ where: { identifier: staffPasswordSetupIdentifier(token), value: binding.userId,
      deletedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } }),
    db.notificationPreference.findFirst({ where: { schoolProfileId: binding.schoolId,
      userId: binding.userId, type: "staff_invitation", deletedAt: null }, select: { email: true } }),
  ]);
  if (!school || school.subDomain !== binding.tenantSlug || !actor || !identity || !credential ||
    identity.user.id !== binding.userId || identity.email !== binding.email || identity.user.role !== binding.role ||
    !reset || preference?.email === false) return null;
  return { school, actor, staff: identity.staff, user: identity.user };
}
