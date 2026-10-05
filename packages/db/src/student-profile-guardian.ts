import type { DatabaseTransaction } from "./prisma";
import type { UpdateStudentBasicProfileInput } from "@school-clerk/utils/student-profile-schema";
import type { Prisma } from "./generated/client";
import { StudentFeeReconciliationError } from "./student-fee-reconciliation";

function conflict(message: string): never {
  throw new StudentFeeReconciliationError("CONFLICT", message);
}

// The caller owns live authorization, the student lock and the Serializable transaction.
export async function updateStudentProfileGuardian(tx: DatabaseTransaction, schoolId: string, studentId: string,
  input: UpdateStudentBasicProfileInput["data"]["guardian"]) {
  if (input === undefined) return false;
  const links = await tx.studentGuardians.findMany({
    where: { studentId, deletedAt: null },
    select: { id: true, guardiansId: true, guardian: { select: { schoolProfileId: true, deletedAt: true } } },
  });
  if (links.length > 1 || links.some((link) => link.guardian.schoolProfileId !== schoolId || link.guardian.deletedAt)) {
    conflict("Guardian relationships need review. This editor cannot choose between multiple or inconsistent links.");
  }
  const link = links[0];
  if (!input?.name && !input?.phone && !input?.phone2) {
    if (!link) return false;
    const removed = await tx.studentGuardians.updateMany({
      where: { id: link.id, studentId, deletedAt: null }, data: { deletedAt: new Date() },
    });
    if (removed.count !== 1) conflict("The guardian relationship changed. Refresh before saving.");
    return true;
  }
  if (!input?.name || !input.phone) conflict("Guardian name and primary phone are required.");
  let guardian = await tx.guardians.findFirst({
    where: { schoolProfileId: schoolId, deletedAt: {},
      ...(input.id ? { id: input.id } : { name: input.name, phone: input.phone }) },
    select: { id: true, name: true, phone: true, phone2: true, userId: true, deletedAt: true },
  });
  if (input.id && !guardian) conflict("The selected guardian is unavailable in this school.");
  let contactChanged = false;
  if (guardian) {
    if (guardian.deletedAt) conflict("Archived guardian contacts cannot be restored through the student editor.");
    if (guardian.userId && link?.guardiansId !== guardian.id) conflict("Linking this login-bound guardian requires the parent identity workflow.");
    contactChanged = guardian.name !== input.name || guardian.phone !== input.phone || (guardian.phone2 || null) !== (input.phone2 || null);
    if (contactChanged) {
      if (link?.guardiansId !== guardian.id || guardian.userId) conflict("Update shared or login-bound contact details through the guardian workflow.");
      const otherWard = await tx.studentGuardians.findFirst({
        where: { guardiansId: guardian.id, studentId: { not: studentId }, deletedAt: null }, select: { id: true },
      });
      if (otherWard) conflict("This contact is shared with another student. Use the guardian workflow to change it.");
      const collision = await tx.guardians.findFirst({
        where: { schoolProfileId: schoolId, name: input.name, phone: input.phone, id: { not: guardian.id }, deletedAt: {} },
        select: { id: true },
      });
      if (collision) conflict("Another guardian contact already uses this name and phone. Review the relationship before saving.");
      const updated = await tx.guardians.updateMany({
        where: { id: guardian.id, schoolProfileId: schoolId, deletedAt: null, userId: null },
        data: { name: input.name, phone: input.phone, phone2: input.phone2 || null },
      });
      if (updated.count !== 1) conflict("The guardian contact changed. Refresh before saving.");
    }
  } else {
    guardian = await tx.guardians.create({
      data: { schoolProfileId: schoolId, name: input.name, phone: input.phone, phone2: input.phone2 || null },
      select: { id: true, name: true, phone: true, phone2: true, userId: true, deletedAt: true },
    });
    contactChanged = true;
  }
  if (link?.guardiansId === guardian.id) return contactChanged;
  if (link) {
    const updated = await tx.studentGuardians.updateMany({
      where: { id: link.id, studentId, deletedAt: null }, data: { guardiansId: guardian.id },
    });
    if (updated.count !== 1) conflict("The guardian relationship changed. Refresh before saving.");
  } else {
    await tx.studentGuardians.create({ data: { studentId, guardiansId: guardian.id } });
  }
  return true;
}
