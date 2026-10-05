import { canAccessModules, resolveModuleAccess } from "@school-clerk/utils/module-config";
import { deleteStudentSchema, type DeleteStudentInput } from "@school-clerk/utils/student-delete-schema";
import { Prisma } from "./generated/client";
import type { Database } from "./prisma";
import { getStudentAcademicReadContext } from "./student-academic-read";

export class StudentDeletionError extends Error {
  constructor(public readonly code: "FORBIDDEN" | "NOT_FOUND" | "CONFLICT", message: string) {
    super(message);
    this.name = "StudentDeletionError";
  }
}

export async function softDeleteStudent(db: Database, actor: {
  schoolId: string; userId: string; bearer: string;
}, input: DeleteStudentInput) {
  const data = deleteStudentSchema.parse(input);
  try {
    return await db.$transaction(async (tx) => {
      const context = await getStudentAcademicReadContext(tx, actor);
      if (!context || !["ADMIN", "REGISTRAR"].includes(context.role?.toUpperCase() ?? "") ||
        !canAccessModules(resolveModuleAccess(context.school.moduleConfiguration), ["STUDENT_MANAGEMENT"])) {
        throw new StudentDeletionError("FORBIDDEN", "Deleting a student requires student management access.");
      }
      const schoolId = context.school.id;
      const scope = data.viewScope;
      if (scope && (scope.schoolId !== schoolId || scope.userId !== actor.userId || scope.loginSessionId !== context.loginSessionId)) {
        throw new StudentDeletionError("CONFLICT", "Your student workspace changed. Reopen the record before deleting it.");
      }
      // Include archived canonical rows only for a same-school repeat check.
      const [student] = await tx.$queryRaw<Array<{ id: string; deletedAt: Date | null }>>(Prisma.sql`
        SELECT id, "deletedAt" FROM "Students"
        WHERE id = ${data.studentId} AND "schoolProfileId" = ${schoolId} FOR UPDATE
      `);
      if (!student) throw new StudentDeletionError("NOT_FOUND", "Student was not found in this school.");
      // A row lock can wait past the session's wall-clock expiry even though
      // the transaction keeps the same authorization snapshot.
      if (!await getStudentAcademicReadContext(tx, actor)) {
        throw new StudentDeletionError("FORBIDDEN", "The deletion session is no longer available. Sign in again before continuing.");
      }
      const sessionForms = await tx.studentSessionForm.findMany({
        where: { studentId: student.id, deletedAt: null },
        select: { id: true, schoolProfileId: true },
      });
      const termForms = await tx.studentTermForm.findMany({
        where: { deletedAt: null, OR: [{ studentId: student.id }, { sessionForm: { studentId: student.id } }] },
        select: { id: true, studentId: true, schoolProfileId: true,
          sessionForm: { select: { studentId: true, schoolProfileId: true } } },
      });
      if ((sessionForms.length || termForms.length) &&
        !canAccessModules(resolveModuleAccess(context.school.moduleConfiguration), ["ACADEMIC_PROGRAMS"])) {
        throw new StudentDeletionError("FORBIDDEN", "Deleting this student's active academic records also requires academic management access.");
      }
      if (sessionForms.some((form) => form.schoolProfileId !== schoolId) ||
        termForms.some((form) => form.schoolProfileId !== schoolId ||
          (form.studentId !== null && form.studentId !== student.id) ||
          form.sessionForm.studentId !== student.id || form.sessionForm.schoolProfileId !== schoolId)) {
        throw new StudentDeletionError("CONFLICT", "Student academic ownership needs review before deletion. No records were changed.");
      }
      if (student.deletedAt) {
        if (sessionForms.length || termForms.length) {
          throw new StudentDeletionError("CONFLICT", "This archived student still has active academic records. Request an integrity review before continuing.");
        }
        return { status: "already-deleted" as const, studentId: student.id };
      }
      const deletedAt = new Date();
      const archivedTerms = await tx.studentTermForm.updateMany({
        where: { id: { in: termForms.map((form) => form.id) }, schoolProfileId: schoolId, deletedAt: null },
        data: { deletedAt },
      });
      const archivedSessions = await tx.studentSessionForm.updateMany({
        where: { id: { in: sessionForms.map((form) => form.id) }, schoolProfileId: schoolId, studentId: student.id, deletedAt: null },
        data: { deletedAt },
      });
      if (archivedTerms.count !== termForms.length || archivedSessions.count !== sessionForms.length) {
        throw new StudentDeletionError("CONFLICT", "Student academic records changed during deletion. Refresh the directory.");
      }
      const archived = await tx.students.updateMany({
        where: { id: student.id, schoolProfileId: schoolId, deletedAt: null }, data: { deletedAt },
      });
      if (archived.count !== 1) throw new StudentDeletionError("CONFLICT", "Student changed during deletion. Refresh the directory.");
      return { status: "deleted" as const, studentId: student.id };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") {
      throw new StudentDeletionError("CONFLICT", "Student records changed concurrently. Refresh the directory before trying again.");
    }
    throw error;
  }
}
