import type { DatabaseTransaction } from "./prisma";
import { studentImportRowSchema, type StudentImportRow, type ImportRowResult } from "@school-clerk/utils/student-import-schema";
import { normalizeStudentDuplicateNameKey } from "@school-clerk/utils/student-duplicate-name";
import { Prisma, type Students } from "./generated/client";
import { requireStudentImportAccess, requireStudentImportTarget, StudentImportAccessError, type StudentImportAuthority } from "./student-import-access";
import { prepareAuthorizedStudentTermFeeReconciliation } from "./student-fee-reconciliation";
import { applyFeeHistoriesToStudentTermForm, reconcileFeeHistoriesForStudentTermForm } from "./student-fee-application";

type ImportScope = { schoolId: string; sessionId: string; termId: string };

function conflict(message: string): never {
  throw new StudentImportAccessError("CONFLICT", message);
}

async function requireScope(tx: DatabaseTransaction, authority: StudentImportAuthority, scope: ImportScope, classroomId: string) {
  const access = await requireStudentImportAccess(tx, authority);
  if (scope.schoolId !== access.schoolId || (access.jobScope &&
    (scope.sessionId !== access.jobScope.sessionId || scope.termId !== access.jobScope.termId))) {
    throw new StudentImportAccessError("FORBIDDEN", "Import workspace does not match its authorized source.");
  }
  await requireStudentImportTarget(tx, scope, [classroomId]);
}

async function assertUniqueClassName(tx: DatabaseTransaction, scope: ImportScope, classroomId: string,
  name: { name: string; surname?: string | null; otherName?: string | null }, excludeId?: string) {
  const formScope = { schoolProfileId: scope.schoolId, sessionTermId: scope.termId,
    classroomDepartmentId: classroomId, deletedAt: null };
  const candidates = await tx.students.findMany({
    where: { schoolProfileId: scope.schoolId, deletedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [
        { termForms: { some: formScope } },
        { sessionForms: { some: { termForms: { some: formScope } } } },
      ],
    },
    select: { name: true, surname: true, otherName: true },
  });
  const key = normalizeStudentDuplicateNameKey(name);
  if (candidates.some((candidate) => normalizeStudentDuplicateNameKey(candidate) === key)) {
    conflict("A student with this exact name already exists in the selected class and term. Review the match before importing.");
  }
}

async function ensureEnrollment(tx: DatabaseTransaction, authority: StudentImportAuthority, scope: ImportScope,
  student: { id: string; gender: "Male" | "Female" }, classroomId: string, admissionType: NonNullable<StudentImportRow["admissionType"]>) {
  const parents = await tx.studentSessionForm.findMany({
    where: { studentId: student.id, deletedAt: {}, OR: [
      { schoolSessionId: scope.sessionId },
      { termForms: { some: { sessionTermId: scope.termId, deletedAt: null } } },
    ] },
    select: { id: true, schoolProfileId: true, schoolSessionId: true, deletedAt: true, classroomDepartmentId: true,
      classroomDepartment: { select: { schoolProfileId: true, deletedAt: true,
        classRoom: { select: { schoolProfileId: true, schoolSessionId: true, deletedAt: true } } } } },
  });
  const activeParents = parents.filter((parent) => !parent.deletedAt);
  if (activeParents.length > 1) conflict("Multiple student session records need review before importing. Nothing was saved.");
  for (const parent of activeParents) {
    const department = parent.classroomDepartment;
    if (parent.schoolProfileId !== scope.schoolId || parent.schoolSessionId !== scope.sessionId ||
      (parent.classroomDepartmentId && (!department || department.schoolProfileId !== scope.schoolId || department.deletedAt ||
        !department.classRoom || department.classRoom.schoolProfileId !== scope.schoolId ||
        department.classRoom.schoolSessionId !== scope.sessionId || department.classRoom.deletedAt))) {
      conflict("Student session ancestry needs review before importing. Nothing was saved.");
    }
  }
  const references = await tx.studentTermForm.findMany({
    where: { deletedAt: null, AND: [
      { OR: [{ studentId: student.id }, { sessionForm: { studentId: student.id } }] },
      { OR: [
        { sessionTermId: scope.termId },
        { sessionTermId: null, OR: [{ schoolSessionId: scope.sessionId }, { sessionForm: { schoolSessionId: scope.sessionId } }] },
      ] },
    ] },
    select: { id: true, studentId: true, schoolProfileId: true, schoolSessionId: true, sessionTermId: true,
      studentSessionFormId: true, classroomDepartmentId: true, admissionType: true },
  });
  if (references.length > 1) conflict("Duplicate or unmapped enrollment needs review before importing. Nothing was saved.");
  const existing = references[0];
  if (existing && (existing.sessionTermId !== scope.termId || existing.schoolSessionId !== scope.sessionId ||
    existing.schoolProfileId !== scope.schoolId || (existing.studentId !== null && existing.studentId !== student.id) ||
    existing.studentSessionFormId !== activeParents[0]?.id)) {
    conflict("Student enrollment ancestry needs review before importing. Nothing was saved.");
  }
  if (existing && existing.classroomDepartmentId !== classroomId) {
    conflict("Student already has an enrollment in another classroom. No name or enrollment changes were saved for this row.");
  }

  // Retained charges on archived/other forms are not adopted or charged again.
  const charges = await tx.financeCharge.findMany({
    where: { studentId: student.id, sessionTermId: scope.termId, deletedAt: null, status: { not: "CANCELLED" } },
    select: { studentTermFormId: true },
  });
  if (charges.some((charge) => !existing || charge.studentTermFormId !== existing.id)) {
    conflict("Existing fees need enrollment-link review before importing. No charges were adopted or duplicated.");
  }

  let formId = existing?.id;
  if (!formId) {
    const parentId = activeParents[0]?.id ?? (await tx.studentSessionForm.create({
      data: { studentId: student.id, schoolProfileId: scope.schoolId, schoolSessionId: scope.sessionId,
        classroomDepartmentId: classroomId }, select: { id: true },
    })).id;
    formId = (await tx.studentTermForm.create({
      data: { studentId: student.id, studentSessionFormId: parentId, schoolProfileId: scope.schoolId,
        schoolSessionId: scope.sessionId, sessionTermId: scope.termId, classroomDepartmentId: classroomId, admissionType },
      select: { id: true },
    })).id;
  }
  await prepareAuthorizedStudentTermFeeReconciliation(tx, {
    schoolId: scope.schoolId,
    recheckAccess: () => requireScope(tx, authority, scope, classroomId),
  }, [formId]);
  const fees = { schoolProfileId: scope.schoolId, studentId: student.id, studentTermFormId: formId,
    schoolSessionId: scope.sessionId, sessionTermId: scope.termId, classroomDepartmentId: classroomId,
    admissionType, studentGender: student.gender };
  if (!existing) {
    await applyFeeHistoriesToStudentTermForm(tx, fees);
  } else if (existing.admissionType !== admissionType) {
    const updated = await tx.studentTermForm.updateMany({
      where: { id: existing.id, schoolProfileId: scope.schoolId, deletedAt: null }, data: { admissionType },
    });
    if (updated.count !== 1) conflict("Enrollment changed before import. Review the row again.");
    await reconcileFeeHistoriesForStudentTermForm(tx, fees);
  }
  return { created: !existing };
}

/** Only inside the caller's Serializable transaction (and queued-row receipt transaction). */
export async function executeStudentImportRow(tx: DatabaseTransaction, authority: StudentImportAuthority,
  scope: ImportScope, rawRow: StudentImportRow, classroomId: string): Promise<ImportRowResult> {
  const row = studentImportRowSchema.parse(rawRow);
  await requireScope(tx, authority, scope, classroomId);
  let student: Pick<Students, "id" | "name" | "surname" | "otherName" | "gender"> | null;
  if (row.action === "import_new") {
    await assertUniqueClassName(tx, scope, classroomId, row);
    student = await tx.students.create({
      data: { name: row.name, surname: row.surname, otherName: row.otherName ?? undefined,
        gender: row.gender, schoolProfileId: scope.schoolId },
      select: { id: true, name: true, surname: true, otherName: true, gender: true },
    });
  } else {
    if (!row.existingStudentId) conflict("Select an existing student before importing a matched row.");
    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM "Students" WHERE id = ${row.existingStudentId}
      AND "schoolProfileId" = ${scope.schoolId} AND "deletedAt" IS NULL FOR UPDATE
    `);
    if (locked.length !== 1) throw new StudentImportAccessError("NOT_FOUND", "Selected student is unavailable in this school.");
    await requireScope(tx, authority, scope, classroomId);
    student = await tx.students.findFirst({
      where: { id: row.existingStudentId, schoolProfileId: scope.schoolId, deletedAt: null },
      select: { id: true, name: true, surname: true, otherName: true, gender: true },
    });
    if (!student) throw new StudentImportAccessError("NOT_FOUND", "Selected student is unavailable in this school.");
    await assertUniqueClassName(tx, scope, classroomId, row.action === "update_match_with_name" ? row : student, student.id);
  }
  const enrollment = await ensureEnrollment(tx, authority, scope, student, classroomId, row.admissionType ?? "UNCLASSIFIED");
  if (row.action === "update_match_with_name") {
    const updated = await tx.students.updateMany({
      where: { id: student.id, schoolProfileId: scope.schoolId, deletedAt: null },
      data: { name: row.name, surname: row.surname, otherName: row.otherName ?? undefined },
    });
    if (updated.count !== 1) conflict("Student changed before import. Nothing was saved for this row.");
  }
  return { lineNumber: row.lineNumber, action: row.action,
    status: row.action === "import_new" ? "created" : row.action === "keep_match" ? "kept" : "updated",
    studentId: student.id, termSheetCreated: enrollment.created };
}
