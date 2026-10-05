import type { DatabaseTransaction } from "./prisma";
import { Prisma } from "./generated/client";
import { getStudentAcademicReadContext } from "./student-academic-read";

export class StudentFeeReconciliationError extends Error {
  constructor(public readonly code: "FORBIDDEN" | "NOT_FOUND" | "CONFLICT", message: string) {
    super(message);
    this.name = "StudentFeeReconciliationError";
  }
}

function conflict(message = "Enrollment or fee ownership needs review. No student or fee changes were committed."): never {
  throw new StudentFeeReconciliationError("CONFLICT", message);
}

// Call only inside the authorized caller's Serializable transaction.
export async function prepareStudentTermFeeReconciliation(tx: DatabaseTransaction, actor: {
  schoolId: string; userId: string; bearer: string;
}, studentTermFormIds: string[]) {
  return prepareAuthorizedStudentTermFeeReconciliation(tx, {
    schoolId: actor.schoolId,
    recheckAccess: async () => {
      if (!await getStudentAcademicReadContext(tx, actor)) {
        throw new StudentFeeReconciliationError("FORBIDDEN", "Your session expired while waiting. Sign in before changing student records.");
      }
    },
  }, studentTermFormIds);
}

// Internal DB helper: the authorized caller supplies its live post-lock check.
// Not exported from the package barrel; jobs must not fabricate a browser session.
export async function prepareAuthorizedStudentTermFeeReconciliation(tx: DatabaseTransaction, access: {
  schoolId: string; recheckAccess: () => Promise<void>;
}, studentTermFormIds: string[]) {
  const schoolId = access.schoolId;
  if (!studentTermFormIds.length || studentTermFormIds.length > 100 || new Set(studentTermFormIds).size !== studentTermFormIds.length) {
    conflict("Fee reconciliation requires between 1 and 100 distinct enrollments.");
  }
  const forms = await tx.studentTermForm.findMany({
    where: { id: { in: studentTermFormIds }, schoolProfileId: schoolId, deletedAt: null },
    select: {
      id: true, studentId: true, studentSessionFormId: true, schoolSessionId: true, sessionTermId: true,
      classroomDepartmentId: true, admissionType: true,
      schoolSession: { select: { schoolId: true, deletedAt: true } },
      sessionTerm: { select: { schoolId: true, sessionId: true, deletedAt: true, lifecycleStatus: true } },
      sessionForm: { select: { studentId: true, schoolProfileId: true, schoolSessionId: true, deletedAt: true } },
      classroomDepartment: { select: { schoolProfileId: true, deletedAt: true,
        classRoom: { select: { schoolProfileId: true, schoolSessionId: true, deletedAt: true } } } },
    },
    orderBy: { id: "asc" },
  });
  if (forms.length !== studentTermFormIds.length) {
    throw new StudentFeeReconciliationError("NOT_FOUND", "One or more selected enrollments are unavailable. Refresh and reselect the records.");
  }
  const targets = forms.map((form) => {
    const studentId = form.studentId ?? form.sessionForm.studentId;
    const department = form.classroomDepartment;
    if (!studentId || studentId !== form.sessionForm.studentId || form.sessionForm.deletedAt ||
      form.sessionForm.schoolProfileId !== schoolId || !form.schoolSessionId || form.sessionForm.schoolSessionId !== form.schoolSessionId ||
      !form.schoolSession || form.schoolSession.schoolId !== schoolId || form.schoolSession.deletedAt ||
      !form.sessionTermId || !form.sessionTerm || form.sessionTerm.schoolId !== schoolId ||
      form.sessionTerm.sessionId !== form.schoolSessionId || form.sessionTerm.deletedAt ||
      !form.classroomDepartmentId || !department || department.schoolProfileId !== schoolId || department.deletedAt ||
      !department.classRoom || department.classRoom.schoolProfileId !== schoolId ||
      department.classRoom.schoolSessionId !== form.schoolSessionId || department.classRoom.deletedAt) conflict();
    if (form.sessionTerm.lifecycleStatus === "CLOSED") conflict("A selected academic term is closed. Fee-affecting changes are unavailable.");
    return { ...form, studentId, schoolSessionId: form.schoolSessionId,
      sessionTermId: form.sessionTermId, classroomDepartmentId: form.classroomDepartmentId };
  });
  const studentIds = [...new Set(targets.map((form) => form.studentId))].sort();
  const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id FROM "Students" WHERE id IN (${Prisma.join(studentIds)})
    AND "schoolProfileId" = ${schoolId} AND "deletedAt" IS NULL ORDER BY id FOR UPDATE
  `);
  if (locked.length !== studentIds.length) conflict("A selected student is unavailable. Refresh the directory.");
  // Match the existing finance reconciler's school/form advisory-lock keys.
  for (const form of targets) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${schoolId}), hashtext(${form.id}))`;
  }
  await access.recheckAccess();
  const termIds = [...new Set(targets.map((form) => form.sessionTermId))];
  const closedLedger = await tx.financeTermLedgerClose.findFirst({
    where: { schoolProfileId: schoolId, sessionTermId: { in: termIds }, status: "CLOSED", deletedAt: null },
    select: { id: true },
  });
  if (closedLedger) conflict("A selected term ledger is closed. Reopen it through the authorized finance workflow before making changes.");
  const students = await tx.students.findMany({
    where: { id: { in: studentIds }, schoolProfileId: schoolId, deletedAt: null },
    select: { id: true, gender: true },
  });
  if (students.length !== studentIds.length) conflict();
  const studentsById = new Map(students.map((student) => [student.id, student]));
  const references = await tx.studentTermForm.findMany({
    where: { sessionTermId: { in: termIds }, deletedAt: null,
      OR: [{ studentId: { in: studentIds } }, { sessionForm: { studentId: { in: studentIds } } }] },
    select: { id: true, studentId: true, sessionTermId: true, sessionForm: { select: { studentId: true } } },
  });
  for (const form of targets) {
    const matches = references.filter((reference) => reference.sessionTermId === form.sessionTermId &&
      (reference.studentId === form.studentId || reference.sessionForm.studentId === form.studentId));
    if (matches.length !== 1 || matches[0]?.id !== form.id) conflict("Duplicate or inconsistent enrollment needs review before fee-affecting changes.");
  }
  // Read only reference metadata until every charge attached to these forms is owned.
  const charges = await tx.financeCharge.findMany({
    where: { deletedAt: null, status: { not: "CANCELLED" }, OR: [
      { studentTermFormId: { in: studentTermFormIds } },
      ...targets.map((form) => ({ studentTermFormId: null, studentId: form.studentId, sessionTermId: form.sessionTermId })),
    ] },
    select: { schoolProfileId: true, studentTermFormId: true, studentId: true, payerType: true,
      schoolSessionId: true, sessionTermId: true, itemId: true, classroomDepartmentId: true,
      classroomDepartment: { select: { schoolProfileId: true, deletedAt: true,
        classRoom: { select: { schoolProfileId: true, schoolSessionId: true, deletedAt: true } } } },
      stream: { select: { schoolProfileId: true, deletedAt: true } },
      item: { select: { schoolProfileId: true } } },
  });
  const formsById = new Map(targets.map((form) => [form.id, form]));
  for (const charge of charges) {
    const form = charge.studentTermFormId ? formsById.get(charge.studentTermFormId) : undefined;
    const department = charge.classroomDepartment;
    if (!form || charge.schoolProfileId !== schoolId || charge.payerType !== "STUDENT" ||
      charge.studentId !== form.studentId || charge.schoolSessionId !== form.schoolSessionId || charge.sessionTermId !== form.sessionTermId ||
      charge.stream.schoolProfileId !== schoolId || charge.stream.deletedAt ||
      (charge.itemId && charge.item?.schoolProfileId !== schoolId) ||
      (charge.classroomDepartmentId && (!department || department.schoolProfileId !== schoolId || department.deletedAt ||
        !department.classRoom || department.classRoom.schoolProfileId !== schoolId ||
        department.classRoom.schoolSessionId !== form.schoolSessionId || department.classRoom.deletedAt))) conflict();
  }
  return { targets, studentIds, studentsById };
}
