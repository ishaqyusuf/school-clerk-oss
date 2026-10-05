import { bulkSetStudentAdmissionTypeSchema, type BulkSetStudentAdmissionTypeInput } from "@school-clerk/utils/student-admission-type-schema";
import { canAccessModules, resolveModuleAccess } from "@school-clerk/utils/module-config";
import { Prisma } from "./generated/client";
import type { Database } from "./prisma";
import { getStudentAcademicReadContext } from "./student-academic-read";
import { reconcileFeeHistoriesForStudentTermForm } from "./student-fee-application";
import { prepareStudentTermFeeReconciliation, StudentFeeReconciliationError as StudentAdmissionTypeError } from "./student-fee-reconciliation";
export { StudentFeeReconciliationError as StudentAdmissionTypeError } from "./student-fee-reconciliation";

function conflict(message = "Enrollment or fee ownership needs review. No admission statuses or fees were changed."): never {
  throw new StudentAdmissionTypeError("CONFLICT", message);
}

export async function classifyStudentTermForms(db: Database, actor: {
  schoolId: string; userId: string; bearer: string;
}, input: BulkSetStudentAdmissionTypeInput) {
  const data = bulkSetStudentAdmissionTypeSchema.parse(input);
  try {
    return await db.$transaction(async (tx) => {
      const context = await getStudentAcademicReadContext(tx, actor);
      if (!context || !["ADMIN", "REGISTRAR"].includes(context.role?.toUpperCase() ?? "") ||
        !canAccessModules(resolveModuleAccess(context.school.moduleConfiguration), ["STUDENT_MANAGEMENT", "ACADEMIC_PROGRAMS", "BILLING_FINANCE"])) {
        throw new StudentAdmissionTypeError("FORBIDDEN", "Admission classification requires student, academic and finance access.");
      }
      const schoolId = context.school.id;
      if (data.viewScope && (data.viewScope.schoolId !== schoolId || data.viewScope.userId !== actor.userId ||
        data.viewScope.loginSessionId !== context.loginSessionId)) conflict("Your admission workspace changed. Refresh before continuing.");
      const { targets, studentIds, studentsById } = await prepareStudentTermFeeReconciliation(tx, actor, data.studentTermFormIds);
      const changedIds = targets.filter((form) => form.admissionType !== data.admissionType).map((form) => form.id);
      if (changedIds.length) {
        const result = await tx.studentTermForm.updateMany({
          where: { id: { in: changedIds }, schoolProfileId: schoolId, deletedAt: null },
          data: { admissionType: data.admissionType },
        });
        if (result.count !== changedIds.length) conflict();
      }
      const reconciliation = [];
      for (const form of targets) {
        const student = studentsById.get(form.studentId);
        if (!student) conflict();
        const result = await reconcileFeeHistoriesForStudentTermForm(tx, {
          schoolProfileId: schoolId, studentId: form.studentId, studentTermFormId: form.id,
          schoolSessionId: form.schoolSessionId, sessionTermId: form.sessionTermId,
          classroomDepartmentId: form.classroomDepartmentId, admissionType: data.admissionType, studentGender: student.gender,
        });
        reconciliation.push({ studentTermFormId: form.id, applied: result.applied, skipped: result.skipped,
          total: result.total, cancelled: result.cancelled, retained: result.retained });
      }
      return { updated: changedIds.length, alreadyClassified: targets.length - changedIds.length,
        studentIds, termFormIds: targets.map((form) => form.id), reconciliation };
    }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 60_000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      conflict("Enrollment or finance records changed concurrently. Refresh the directory and balances before retrying.");
    }
    throw error;
  }
}
