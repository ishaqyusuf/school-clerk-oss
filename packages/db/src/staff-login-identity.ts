import type { DatabaseTransaction } from "./prisma";
import type { Prisma } from "./generated/client";

type IdentityDatabase = Pick<DatabaseTransaction, "user" | "staffProfile" | "account" | "session">;

// Email linkage is legacy, not proof of a durable Staff-to-User relationship.
// Password setup must not choose a winner among conflicting histories.
export async function getStaffInvitationIdentity(db: Pick<IdentityDatabase, "user" | "staffProfile">, input: {
  staffId: string; schoolId: string; accountId: string;
}) {
  const staff = await db.staffProfile.findFirst({
    where: { id: input.staffId, schoolProfileId: input.schoolId, deletedAt: null, onboardedAt: null,
      OR: [{ inviteStatus: null }, { inviteStatus: { not: "ACTIVE" } }],
      schoolProfile: { accountId: input.accountId, deletedAt: null,
        account: { deletedAt: null, qaPurgeStartedAt: null } } },
    select: { id: true, name: true, email: true },
  });
  const email = staff?.email?.trim().toLowerCase();
  if (!staff || !email || staff.email !== email) return null;
  const [users, sharedStaff] = await Promise.all([
    db.user.findMany({ where: { deletedAt: {}, email: { equals: email, mode: "insensitive" } },
      select: { id: true, name: true, email: true, role: true, saasAccountId: true, deletedAt: true }, take: 2 }),
    db.staffProfile.findFirst({ where: { id: { not: staff.id }, deletedAt: null,
      email: { equals: email, mode: "insensitive" }, schoolProfile: { accountId: input.accountId } },
      select: { id: true } }),
  ]);
  const user = users[0];
  if (users.length !== 1 || !user || user.deletedAt || user.saasAccountId !== input.accountId ||
    user.email !== email || !user.role || sharedStaff) return null;
  return { staff, user: { ...user, role: user.role }, email };
}

export async function getStaffCredentialAccount(db: Pick<IdentityDatabase, "account">, userId: string) {
  // Explicit empty filter bypasses the client's default deletedAt:null scope.
  const accounts = await db.account.findMany({
    where: { deletedAt: {}, providerId: "credential", OR: [{ userId }, { accountId: userId }] },
    select: { id: true, userId: true, accountId: true, deletedAt: true }, take: 2,
  });
  const account = accounts[0];
  if (accounts.length !== 1 || !account || account.deletedAt ||
    account.userId !== userId || account.accountId !== userId) return null;
  return account;
}

// Caller owns the serializable transaction; never revive or reassign a login.
export async function ensureStaffCredentialAccount(db: Pick<IdentityDatabase, "account">, userId: string) {
  const existing = await getStaffCredentialAccount(db, userId);
  if (existing) return existing.id;
  const conflict = await db.account.findFirst({
    where: { deletedAt: {}, providerId: "credential", OR: [{ userId }, { accountId: userId }] }, select: { id: true },
  });
  if (conflict) throw new Error("The staff credential is archived or ambiguous. Review account access before inviting.");
  const created = await db.account.create({
    data: { userId, accountId: userId, providerId: "credential" }, select: { id: true },
  });
  return created.id;
}

export function updateStaffInvitationStatus(db: Pick<DatabaseTransaction, "staffProfile">, input: {
  staffId: string; schoolId: string; accountId: string; email: string;
  status: "PENDING" | "FAILED"; error?: string | null; resent?: boolean;
}) {
  const now = new Date();
  return db.staffProfile.updateMany({
    where: { id: input.staffId, schoolProfileId: input.schoolId, email: input.email,
      deletedAt: null, onboardedAt: null, OR: [{ inviteStatus: null }, { inviteStatus: { not: "ACTIVE" } }],
      schoolProfile: { accountId: input.accountId, deletedAt: null,
        account: { deletedAt: null, qaPurgeStartedAt: null } } },
    data: { inviteStatus: input.status, inviteSentAt: input.status === "PENDING" ? now : undefined,
      inviteResentAt: input.resent ? now : undefined, lastInviteError: input.error ?? null },
  });
}

// Use inside the staff save's serializable transaction. Legacy staff identity
// is still email-linked; ambiguous histories need explicit review, never a merge.
export async function saveStaffLoginIdentity(db: IdentityDatabase, input: {
  staffId: string; accountId: string; actorUserId: string;
  previousEmail: string | null; email: string; name: string; role: string;
  allowedRoles: readonly string[];
}) {
  const previousEmail = input.previousEmail?.trim().toLowerCase();
  const previous = previousEmail ? await db.user.findMany({
    where: { saasAccountId: input.accountId, email: { equals: previousEmail, mode: "insensitive" }, deletedAt: null },
    select: { id: true, email: true, role: true }, take: 2,
  }) : [];
  if (previous.length > 1) throw new Error("This staff email matches multiple logins. Resolve the identity conflict before saving.");
  const existing = previous[0];
  const collisions = await db.user.findMany({
    where: { deletedAt: {}, email: { equals: input.email, mode: "insensitive" }, ...(existing ? { id: { not: existing.id } } : {}) },
    select: { id: true }, take: 1,
  });
  if (collisions.length) throw new Error("That email already belongs to a login. Staff editing cannot merge or replace another account.");
  const duplicateStaff = !existing || previousEmail !== input.email ? await db.staffProfile.findFirst({
    where: { id: { not: input.staffId }, email: { equals: input.email, mode: "insensitive" }, deletedAt: null,
      schoolProfile: { accountId: input.accountId } }, select: { id: true },
  }) : null;
  if (duplicateStaff) throw new Error("That email is already linked to another staff profile. Review the existing identity first.");
  if (!existing) {
    const user = await db.user.create({ data: { email: input.email, name: input.name, role: input.role,
      saasAccountId: input.accountId, emailVerified: false }, select: { id: true } });
    return { id: user.id, roleChanged: false };
  }
  if (!existing.role || !input.allowedRoles.some((role) => role.toLowerCase() === existing.role?.toLowerCase())) {
    throw new Error("This email belongs to a non-staff identity. Use an explicit account-management workflow.");
  }
  const emailChanged = existing.email.trim().toLowerCase() !== input.email;
  const roleChanged = existing.role.toLowerCase() !== input.role.toLowerCase();
  if (existing.id === input.actorUserId && (emailChanged || roleChanged)) {
    throw new Error("This staff form cannot change your own login email or role. Request a separate account-access review.");
  }
  if (emailChanged || roleChanged) {
    const shared = await db.staffProfile.findFirst({ where: { id: { not: input.staffId }, deletedAt: null,
      email: { equals: existing.email, mode: "insensitive" }, schoolProfile: { accountId: input.accountId } },
      select: { id: true } });
    if (shared) throw new Error("This login is shared by multiple school staff profiles. Review all affected profiles before changing identity or role.");
  }
  if (emailChanged) {
    const externalLogin = await db.account.findFirst({ where: { userId: existing.id,
      providerId: { not: "credential" }, deletedAt: null }, select: { id: true } });
    if (externalLogin) throw new Error("This login has an external identity provider. Its email change needs a separate account-access review.");
    await db.account.updateMany({ where: { userId: existing.id, providerId: "credential" }, data: { password: null } });
  }
  const updated = await db.user.updateMany({ where: { id: existing.id, saasAccountId: input.accountId,
    email: existing.email, role: existing.role, deletedAt: null }, data: {
      email: input.email, name: input.name, role: input.role,
      ...(emailChanged ? { emailVerified: false, password: null } : {}),
    } });
  if (updated.count !== 1) throw new Error("The staff login changed. Reload before saving.");
  if (emailChanged || roleChanged) {
    await db.session.updateMany({ where: { userId: existing.id, deletedAt: null }, data: { deletedAt: new Date() } });
  }
  return { id: existing.id, roleChanged };
}
