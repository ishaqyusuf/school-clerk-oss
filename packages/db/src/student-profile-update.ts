import { studentProfileUpdateSchema, type StudentProfileUpdateInput } from "@school-clerk/utils/student-profile-schema";
import { canAccessModules, resolveModuleAccess } from "@school-clerk/utils/module-config";
import { Prisma } from "./generated/client";
import type { Database } from "./prisma";
import { getStudentAcademicReadContext } from "./student-academic-read";
import { prepareStudentTermFeeReconciliation, StudentFeeReconciliationError } from "./student-fee-reconciliation";
import { reconcileFeeHistoriesForStudentTermForm } from "./student-fee-application";
import { updateStudentProfileGuardian } from "./student-profile-guardian";

function conflict(message: string): never { throw new StudentFeeReconciliationError("CONFLICT", message); }

export async function updateStudentProfile(db: Database, actor: { schoolId: string; userId: string; bearer: string }, input: StudentProfileUpdateInput) {
  const data = studentProfileUpdateSchema.parse(input);
  try {
    return await db.$transaction(async (tx) => {
      const context = await getStudentAcademicReadContext(tx, actor);
      if (!context || !["ADMIN", "REGISTRAR"].includes(context.role?.toUpperCase() ?? "") ||
        !canAccessModules(resolveModuleAccess(context.school.moduleConfiguration), ["STUDENT_MANAGEMENT"])) {
        throw new StudentFeeReconciliationError("FORBIDDEN", "Student management access is required.");
      }
      const schoolId = context.school.id;
      if (data.viewScope && (data.viewScope.schoolId !== schoolId || data.viewScope.userId !== actor.userId || data.viewScope.loginSessionId !== context.loginSessionId)) {
        conflict("Your student workspace changed. Reopen the editor before saving.");
      }
      const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id FROM "Students" WHERE id = ${data.id} AND "schoolProfileId" = ${schoolId} AND "deletedAt" IS NULL FOR UPDATE
      `);
      if (locked.length !== 1) throw new StudentFeeReconciliationError("NOT_FOUND", "Student is unavailable in this school.");
      if (!await getStudentAcademicReadContext(tx, actor)) throw new StudentFeeReconciliationError("FORBIDDEN", "Your session expired while waiting. Sign in before saving.");
      const student = await tx.students.findFirst({ where: { id: data.id, schoolProfileId: schoolId, deletedAt: null }, select: { id: true, gender: true } });
      if (!student) conflict("Student identity changed. Refresh before saving.");
      const gender = "data" in data ? data.data.gender : data.gender;
      const genderChanged = student.gender !== gender;
      const reconciliation: Array<{ studentTermFormId: string; applied: number; cancelled: number; retained: number }> = [];
      const preservedTermFormIds: string[] = [];
      if (genderChanged) {
        const forms = await tx.studentTermForm.findMany({
          where: { deletedAt: null, OR: [{ studentId: student.id }, { sessionForm: { studentId: student.id } }] },
          select: { id: true, studentId: true, schoolProfileId: true, schoolSessionId: true, sessionTermId: true,
            schoolSession: { select: { schoolId: true, deletedAt: true } },
            sessionTerm: { select: { schoolId: true, sessionId: true, deletedAt: true, lifecycleStatus: true } },
            sessionForm: { select: { studentId: true, schoolProfileId: true, schoolSessionId: true, deletedAt: true } } },
        });
        if (forms.length && !canAccessModules(resolveModuleAccess(context.school.moduleConfiguration), ["ACADEMIC_PROGRAMS", "BILLING_FINANCE"])) {
          throw new StudentFeeReconciliationError("FORBIDDEN", "Changing an enrolled student's gender also requires academic and finance access.");
        }
        for (const form of forms) {
          if ((form.studentId !== null && form.studentId !== student.id) || form.sessionForm.studentId !== student.id ||
            form.schoolProfileId !== schoolId || form.sessionForm.schoolProfileId !== schoolId || form.sessionForm.deletedAt ||
            !form.schoolSessionId || form.sessionForm.schoolSessionId !== form.schoolSessionId || !form.schoolSession || form.schoolSession.deletedAt || form.schoolSession.schoolId !== schoolId ||
            !form.sessionTermId || !form.sessionTerm || form.sessionTerm.deletedAt || form.sessionTerm.schoolId !== schoolId || form.sessionTerm.sessionId !== form.schoolSessionId) {
            conflict("Enrollment history needs integrity review before changing gender. Nothing was saved.");
          }
        }
        const closedLedgers = await tx.financeTermLedgerClose.findMany({
          where: { schoolProfileId: schoolId, sessionTermId: { in: forms.flatMap((form) => form.sessionTermId ? [form.sessionTermId] : []) }, status: "CLOSED", deletedAt: null },
          select: { sessionTermId: true },
        });
        const closedTermIds = new Set(closedLedgers.map((row) => row.sessionTermId));
        const openIds: string[] = [];
        for (const form of forms) {
          if (form.sessionTerm?.lifecycleStatus === "CLOSED" || (form.sessionTermId && closedTermIds.has(form.sessionTermId))) preservedTermFormIds.push(form.id);
          else openIds.push(form.id);
        }
        if (openIds.length > 100) conflict("This correction affects more than 100 open enrollments and requires a reviewed batch workflow.");
        if (openIds.length) {
          const prepared = await prepareStudentTermFeeReconciliation(tx, actor, openIds);
          for (const form of prepared.targets) {
            const result = await reconcileFeeHistoriesForStudentTermForm(tx, { schoolProfileId: schoolId, studentId: student.id,
              studentTermFormId: form.id, schoolSessionId: form.schoolSessionId, sessionTermId: form.sessionTermId,
              classroomDepartmentId: form.classroomDepartmentId, admissionType: form.admissionType, studentGender: gender });
            reconciliation.push({ studentTermFormId: form.id, applied: result.applied, cancelled: result.cancelled, retained: result.retained });
          }
        }
      }
      const guardianChanged = "data" in data ? await updateStudentProfileGuardian(tx, schoolId, student.id, data.data.guardian) : false;
      const updated = await tx.students.updateMany({
        where: { id: student.id, schoolProfileId: schoolId, deletedAt: null },
        data: "data" in data ? { name: data.data.name, surname: data.data.surname, otherName: data.data.otherName || null, dob: data.data.dob || null, gender } : { gender },
      });
      if (updated.count !== 1) conflict("Student changed before saving. No profile or fee changes were committed.");
      return { studentId: student.id, updated: "data" in data || genderChanged ? 1 : 0, genderChanged, guardianChanged, reconciliation, preservedTermFormIds };
    }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 60_000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code)) conflict("Student, guardian or finance records changed or conflict. Refresh and review before retrying.");
    throw error;
  }
}
