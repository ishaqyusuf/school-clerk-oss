import type { Database } from "./prisma";

type EnrollmentAccessDatabase = Pick<Database, "enrollmentApplication" | "enrollmentApplicationParent" | "user" | "account" | "guardians" | "verification">;

export class EnrollmentParentAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnrollmentParentAccessError";
  }
}

export function getEnrollmentParentAccess(
  db: EnrollmentAccessDatabase,
  input: { applicationId: string; code: string },
) {
  return db.enrollmentApplication.findFirst({
    where: {
      id: input.applicationId,
      deletedAt: null,
      status: { in: ["SUBMITTED", "UNDER_REVIEW", "APPROVED"] },
      enrollmentLink: { code: input.code, status: "ACTIVE", deletedAt: null },
      schoolProfile: { deletedAt: null },
    },
    include: {
      parents: { where: { deletedAt: null }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }, { id: "asc" }] },
      schoolProfile: {
        select: {
          id: true, accountId: true, name: true, subDomain: true,
          moduleConfiguration: { select: { version: true, revision: true, enabledModules: true, entitledModules: true } },
        },
      },
    },
  });
}

export async function assertEnrollmentGuardianAccountLink(
  db: EnrollmentAccessDatabase,
  input: { guardianId: string; schoolId: string; userId: string; studentId?: string | null },
) {
  const guardian = await db.guardians.findFirst({
    where: { id: input.guardianId, schoolProfileId: input.schoolId, deletedAt: null },
    select: {
      userId: true,
      wards: { where: { deletedAt: null }, select: { studentId: true } },
    },
  });
  if (!guardian ||
    (guardian.userId && guardian.userId !== input.userId) ||
    (!guardian.userId && guardian.wards.some((ward) => ward.studentId !== input.studentId))) {
    throw new EnrollmentParentAccessError("The school must review the existing guardian account before linking this application.");
  }
}

export async function createOrUpdateEnrollmentGuardian(
  db: EnrollmentAccessDatabase,
  input: { schoolId: string; name: string; phone: string; phone2: string; userId: string | null },
) {
  const existing = await db.guardians.findUnique({
    where: { name_phone_schoolProfileId: { name: input.name, phone: input.phone, schoolProfileId: input.schoolId } },
    select: { id: true, deletedAt: true },
  });
  if (existing?.deletedAt) throw new EnrollmentParentAccessError("The school must review the archived guardian before approval.");
  if (!existing) {
    return db.guardians.create({
      data: { name: input.name, phone: input.phone, phone2: input.phone2, schoolProfileId: input.schoolId, userId: input.userId },
      select: { id: true },
    });
  }
  const updated = await db.guardians.updateMany({
    where: {
      id: existing.id, schoolProfileId: input.schoolId, deletedAt: null,
      ...(input.userId ? { OR: [
        { userId: input.userId },
        { userId: null, wards: { none: { deletedAt: null } } },
      ] } : {}),
    },
    data: { phone2: input.phone2, ...(input.userId ? { userId: input.userId } : {}) },
  });
  if (updated.count !== 1) throw new EnrollmentParentAccessError("The school must review the existing guardian account before approval.");
  return { id: existing.id };
}

// Call inside the challenge-consumption transaction, after email proof and
// application/module revalidation. Application phone/name never selects a user.
export async function completeEnrollmentParentIdentity(
  db: EnrollmentAccessDatabase,
  input: {
    parentId: string; applicationId: string; schoolId: string; accountId: string;
    email: string; name: string; passwordHash: string;
    guardianId: string | null; studentId: string | null;
  },
) {
  const matches = await db.user.findMany({
    where: { email: { equals: input.email, mode: "insensitive" }, deletedAt: null },
    include: { accounts: { where: { deletedAt: null } } },
    take: 2,
  });
  const existing = matches[0];
  if (matches.length > 1 || (existing &&
    (existing.saasAccountId !== input.accountId || existing.role?.toLowerCase() !== "parent"))) {
    throw new EnrollmentParentAccessError("Please contact the school to resolve this email's existing account.");
  }
  const user = existing ?? await db.user.create({
    data: {
      name: input.name, email: input.email, emailVerified: true,
      role: "Parent", saasAccountId: input.accountId,
      // Application phone is contact data, not verified phone-login ownership.
      phoneNo: null,
    },
    include: { accounts: true },
  });
  if (input.guardianId) {
    await assertEnrollmentGuardianAccountLink(db, {
      guardianId: input.guardianId, schoolId: input.schoolId,
      userId: user.id, studentId: input.studentId,
    });
  }
  const credential = user.accounts.find((account) => account.providerId === "credential");
  const hadPassword = Boolean(user.password || credential?.password);
  if (!hadPassword) {
    if (credential) {
      const initialized = await db.account.updateMany({
        where: { id: credential.id, userId: user.id, providerId: "credential", password: null, deletedAt: null },
        data: { password: input.passwordHash },
      });
      if (initialized.count !== 1) throw new EnrollmentParentAccessError("The login changed. Please sign in or request another setup link.");
    } else {
      await db.account.create({
        data: { userId: user.id, accountId: user.id, providerId: "credential", password: input.passwordHash },
      });
    }
  }
  await db.user.update({ where: { id: user.id }, data: { emailVerified: true } });
  const linked = await db.enrollmentApplicationParent.updateMany({
    where: { id: input.parentId, enrollmentApplicationId: input.applicationId, deletedAt: null,
      OR: [{ linkedUserId: null }, { linkedUserId: user.id }] },
    data: { linkedUserId: user.id },
  });
  if (linked.count !== 1) throw new EnrollmentParentAccessError("The school must review this application's existing parent link.");
  if (input.guardianId) {
    const guardian = await db.guardians.updateMany({
      where: { id: input.guardianId, schoolProfileId: input.schoolId, deletedAt: null,
        OR: [
          { userId: user.id },
          { userId: null, wards: { none: { deletedAt: null,
            ...(input.studentId ? { studentId: { not: input.studentId } } : {}),
          } } },
        ] },
      data: { userId: user.id },
    });
    if (guardian.count !== 1) throw new EnrollmentParentAccessError("The guardian account changed. Please contact the school.");
  }
  return { hadPassword };
}
