import { getStudentTermDetailsSchema, type GetStudentTermDetailsInput } from "@api/schemas/student-term-details";
import type { TRPCContext } from "@api/trpc/init";
import { getStudentAcademicReadContext, getStudentTermDetailRecords, StudentTermDetailsError } from "@school-clerk/db";
import { canAccessModules, resolveModuleAccess } from "@school-clerk/utils/module-config";
import { formatStudentName, normalizeStudentNameFormat } from "@school-clerk/utils";
import { TRPCError } from "@trpc/server";

export async function readStudentTermDetails(ctx: TRPCContext, input: GetStudentTermDetailsInput) {
  const query = getStudentTermDetailsSchema.parse(input);
  const schoolId = ctx.profile.schoolId;
  const userId = ctx.currentUser?.id;
  const bearer = ctx.profile.authSessionId;
  if (!schoolId || !userId || !bearer) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "A signed-in school workspace is required." });
  }
  try {
    return await ctx.db.$transaction(async (tx) => {
      const context = await getStudentAcademicReadContext(tx, { schoolId, userId, bearer });
      const role = context?.role?.toUpperCase();
      if (!context || (role !== "ADMIN" && role !== "REGISTRAR")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Term enrollment details require student management access." });
      }
      const modules = resolveModuleAccess(context.school.moduleConfiguration);
      if (!modules.config || !canAccessModules(modules, ["STUDENT_MANAGEMENT", "ACADEMIC_PROGRAMS"])) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Student and academic modules are required." });
      }
      const scope = { schoolId, userId, loginSessionId: context.loginSessionId, role, moduleRevision: modules.config.revision };
      if (query.viewScope && (query.viewScope.schoolId !== schoolId || query.viewScope.userId !== userId ||
        query.viewScope.loginSessionId !== context.loginSessionId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Your enrollment workspace changed. Refresh the page." });
      }
      if (query.viewScope && (query.viewScope.role !== role || query.viewScope.moduleRevision !== scope.moduleRevision)) {
        throw new TRPCError({ code: "CONFLICT", message: "Enrollment access changed. Refresh the current preview." });
      }
      const details = await getStudentTermDetailRecords(tx, { schoolId, id: query.id, access: {
        assessments: canAccessModules(modules, ["ASSESSMENT_AND_EXAMS"]),
        attendance: canAccessModules(modules, ["ATTENDANCE"]),
        finance: role === "ADMIN" && canAccessModules(modules, ["BILLING_FINANCE"]),
      } });
      return { ...details, scope,
        studentName: formatStudentName(details.student, normalizeStudentNameFormat(context.school.studentNameFormat)) };
    }, { isolationLevel: "RepeatableRead" });
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    if (error instanceof StudentTermDetailsError) throw new TRPCError({ code: error.code, message: error.message });
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Enrollment details could not be loaded. Refresh before continuing." });
  }
}
