import { canAccessModules, resolveModuleAccess } from "@school-clerk/utils/module-config";
import { Prisma } from "./generated/client";
import type { Database } from "./prisma";
import { getStudentAcademicReadContext, getStudentAcademicRecords } from "./student-academic-read";
import { applyFeeHistoriesToStudentTermForm } from "./student-fee-application";

export class StudentTermEnrollmentError extends Error {
  constructor(public readonly code: "FORBIDDEN" | "NOT_FOUND" | "CONFLICT", message: string) {
    super(message);
    this.name = "StudentTermEnrollmentError";
  }
}

export type StudentTermEnrollmentInput = {
  studentId: string; classroomDepartmentId: string; schoolSessionId: string; sessionTermId: string;
  studentSessionFormId?: string | null;
};

export async function enrollStudentInAcademicTerm(db: Database, actor: {
  schoolId: string; userId: string; bearer: string;
}, input: StudentTermEnrollmentInput) {
  return db.$transaction(async (tx) => {
    const context = await getStudentAcademicReadContext(tx, actor);
    if (!context || !["ADMIN", "REGISTRAR"].includes(context.role?.toUpperCase() ?? "") ||
      !canAccessModules(resolveModuleAccess(context.school.moduleConfiguration), ["STUDENT_MANAGEMENT", "ACADEMIC_PROGRAMS"])) {
      throw new StudentTermEnrollmentError("FORBIDDEN", "Enrollment requires student and academic management access.");
    }
    const schoolId = context.school.id;
    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM "Students" WHERE id = ${input.studentId}
      AND "schoolProfileId" = ${schoolId} AND "deletedAt" IS NULL FOR UPDATE
    `);
    if (!locked.length) throw new StudentTermEnrollmentError("NOT_FOUND", "Student was not found in this school.");
    // A request may have waited on another enrollment's lock.
    if (!await getStudentAcademicReadContext(tx, actor)) {
      throw new StudentTermEnrollmentError("FORBIDDEN", "The enrollment session is no longer available.");
    }
    const term = await tx.sessionTerm.findFirst({
      where: { id: input.sessionTermId, schoolId, sessionId: input.schoolSessionId, deletedAt: null,
        session: { schoolId, deletedAt: null } },
      select: { id: true, lifecycleStatus: true },
    });
    if (!term) throw new StudentTermEnrollmentError("NOT_FOUND", "Academic term and session were not found in this school.");
    if (term.lifecycleStatus === "CLOSED") throw new StudentTermEnrollmentError("CONFLICT", "This academic term is closed.");
    const classroom = await tx.classRoomDepartment.findFirst({
      where: { id: input.classroomDepartmentId, schoolProfileId: schoolId, deletedAt: null,
        classRoom: { schoolProfileId: schoolId, schoolSessionId: input.schoolSessionId, deletedAt: null } },
      select: { id: true },
    });
    if (!classroom) throw new StudentTermEnrollmentError("NOT_FOUND", "Classroom was not found in the selected school session.");
    const records = await getStudentAcademicRecords(tx, { schoolId, studentId: input.studentId });
    if (!records) throw new StudentTermEnrollmentError("NOT_FOUND", "Student was not found.");
    const existing = records.forms.filter((form) => form.sessionTermId === term.id);
    const referenceCount = records.referenceCounts.get(term.id) ?? 0;
    if (referenceCount) {
      const form = referenceCount === 1 && existing.length === 1 ? existing[0] : undefined;
      if (!form || form.classroomDepartment?.id !== classroom.id ||
        (input.studentSessionFormId && form.sessionForm.id !== input.studentSessionFormId)) {
        throw new StudentTermEnrollmentError("CONFLICT", "Existing enrollment needs review. Refresh history before making another change.");
      }
      return { status: "already-enrolled" as const, studentTermFormId: form.id, studentSessionFormId: form.sessionForm.id };
    }
    if (records.hasUnmappedHistory) throw new StudentTermEnrollmentError("CONFLICT", "Existing academic history needs review before enrollment.");
    const sessionForms = await tx.studentSessionForm.findMany({
      where: { studentId: input.studentId, schoolSessionId: input.schoolSessionId, deletedAt: null },
      select: { id: true },
    });
    if (sessionForms.length > 1 || (input.studentSessionFormId && sessionForms[0]?.id !== input.studentSessionFormId)) {
      throw new StudentTermEnrollmentError("CONFLICT", "Student session records changed or need review. Refresh history.");
    }
    let studentSessionFormId = sessionForms[0]?.id;
    if (studentSessionFormId) {
      const owned = await tx.studentSessionForm.findFirst({
        where: { id: studentSessionFormId, studentId: input.studentId, schoolProfileId: schoolId,
          schoolSessionId: input.schoolSessionId, deletedAt: null,
          OR: [{ classroomDepartmentId: null }, { classroomDepartment: { schoolProfileId: schoolId, deletedAt: null,
            classRoom: { schoolProfileId: schoolId, schoolSessionId: input.schoolSessionId, deletedAt: null } } }] },
        select: { id: true },
      });
      if (!owned) throw new StudentTermEnrollmentError("CONFLICT", "Student session ownership needs review.");
    } else {
      studentSessionFormId = (await tx.studentSessionForm.create({ data: {
        schoolProfileId: schoolId, schoolSessionId: input.schoolSessionId, studentId: input.studentId,
        classroomDepartmentId: classroom.id,
      }, select: { id: true } })).id;
    }
    const termForm = await tx.studentTermForm.create({ data: {
      schoolProfileId: schoolId, schoolSessionId: input.schoolSessionId, sessionTermId: term.id,
      studentId: input.studentId, studentSessionFormId, classroomDepartmentId: classroom.id,
      admissionType: "RETURNING",
    }, select: { id: true } });
    if (canAccessModules(resolveModuleAccess(context.school.moduleConfiguration), ["BILLING_FINANCE"])) await applyFeeHistoriesToStudentTermForm(tx, {
      schoolProfileId: schoolId, studentId: input.studentId, studentTermFormId: termForm.id,
      schoolSessionId: input.schoolSessionId, sessionTermId: term.id, classroomDepartmentId: classroom.id,
      admissionType: "RETURNING", studentGender: records.student.gender,
    });
    return { status: "enrolled" as const, studentTermFormId: termForm.id, studentSessionFormId };
  }, { isolationLevel: "Serializable" });
}
