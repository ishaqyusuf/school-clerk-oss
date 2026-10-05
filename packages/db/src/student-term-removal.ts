import { canAccessModules, resolveModuleAccess } from "@school-clerk/utils/module-config";
import { bulkDeleteTermSheetsSchema, type BulkDeleteTermSheetsInput } from "@school-clerk/utils/student-delete-schema";
import { Prisma } from "./generated/client";
import type { Database } from "./prisma";
import { getStudentAcademicReadContext } from "./student-academic-read";

export class StudentTermRemovalError extends Error {
  constructor(public readonly code: "FORBIDDEN" | "NOT_FOUND" | "CONFLICT", message: string) {
    super(message);
    this.name = "StudentTermRemovalError";
  }
}

export async function softDeleteStudentTermForms(db: Database, actor: {
  schoolId: string; userId: string; bearer: string;
}, input: BulkDeleteTermSheetsInput) {
  const data = bulkDeleteTermSheetsSchema.parse(input);
  try {
    return await db.$transaction(async (tx) => {
      const context = await getStudentAcademicReadContext(tx, actor);
      if (!context || !["ADMIN", "REGISTRAR"].includes(context.role?.toUpperCase() ?? "") ||
        !canAccessModules(resolveModuleAccess(context.school.moduleConfiguration), ["STUDENT_MANAGEMENT", "ACADEMIC_PROGRAMS"])) {
        throw new StudentTermRemovalError("FORBIDDEN", "Enrollment removal requires student and academic management access.");
      }
      const schoolId = context.school.id;
      const scope = data.viewScope;
      if (scope && (scope.schoolId !== schoolId || scope.userId !== actor.userId || scope.loginSessionId !== context.loginSessionId)) {
        throw new StudentTermRemovalError("CONFLICT", "Your enrollment workspace changed. Refresh before removing records.");
      }
      const forms = await tx.studentTermForm.findMany({
        where: { id: { in: data.ids }, schoolProfileId: schoolId, deletedAt: {} },
        select: {
          id: true, deletedAt: true, studentId: true, schoolSessionId: true,
          student: { select: { id: true, schoolProfileId: true, deletedAt: true } },
          schoolSession: { select: { id: true, schoolId: true, deletedAt: true } },
          sessionTerm: { select: { schoolId: true, sessionId: true, deletedAt: true, lifecycleStatus: true } },
          sessionForm: { select: { schoolProfileId: true, schoolSessionId: true, studentId: true, deletedAt: true,
            student: { select: { id: true, schoolProfileId: true, deletedAt: true } } } },
        },
      });
      if (forms.length !== data.ids.length) {
        throw new StudentTermRemovalError("NOT_FOUND", "One or more requested term records were not found in this school. No records were changed.");
      }
      const studentIds = new Set<string>();
      for (const form of forms) {
        const studentId = form.studentId ?? form.sessionForm.studentId;
        const student = form.studentId ? form.student : form.sessionForm.student;
        if (!studentId || !student || student.id !== studentId || student.deletedAt || student.schoolProfileId !== schoolId ||
          form.sessionForm.studentId !== studentId || form.sessionForm.schoolProfileId !== schoolId || form.sessionForm.deletedAt ||
          !form.schoolSessionId || !form.schoolSession || form.schoolSession.id !== form.schoolSessionId || form.schoolSession.schoolId !== schoolId || form.schoolSession.deletedAt ||
          form.sessionForm.schoolSessionId !== form.schoolSessionId || !form.sessionTerm ||
          form.sessionTerm.schoolId !== schoolId || form.sessionTerm.sessionId !== form.schoolSessionId || form.sessionTerm.deletedAt) {
          throw new StudentTermRemovalError("CONFLICT", "Enrollment ownership or academic links need review. No records were changed.");
        }
        if (!form.deletedAt && form.sessionTerm.lifecycleStatus === "CLOSED") {
          throw new StudentTermRemovalError("CONFLICT", "An enrollment belongs to a closed academic term. No records were changed.");
        }
        studentIds.add(studentId);
      }
      const orderedStudentIds = [...studentIds].sort();
      const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id FROM "Students" WHERE id IN (${Prisma.join(orderedStudentIds)})
        AND "schoolProfileId" = ${schoolId} AND "deletedAt" IS NULL ORDER BY id FOR UPDATE
      `);
      if (locked.length !== orderedStudentIds.length) {
        throw new StudentTermRemovalError("CONFLICT", "Students changed during enrollment removal. Refresh the directory.");
      }
      if (!await getStudentAcademicReadContext(tx, actor)) {
        throw new StudentTermRemovalError("FORBIDDEN", "The removal session is no longer available. Sign in again before continuing.");
      }
      const activeIds = forms.filter((form) => !form.deletedAt).map((form) => form.id);
      if (activeIds.length) {
        const removed = await tx.studentTermForm.updateMany({
          where: { id: { in: activeIds }, schoolProfileId: schoolId, deletedAt: null },
          data: { deletedAt: new Date() },
        });
        if (removed.count !== activeIds.length) {
          throw new StudentTermRemovalError("CONFLICT", "Enrollment records changed during removal. Refresh before trying again.");
        }
      }
      return { count: activeIds.length, alreadyDeleted: forms.length - activeIds.length, studentIds: orderedStudentIds };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") {
      throw new StudentTermRemovalError("CONFLICT", "Enrollment changed concurrently. Refresh before trying again.");
    }
    throw error;
  }
}
