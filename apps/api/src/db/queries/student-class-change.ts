import type { TRPCContext } from "@api/trpc/init";
import { moveStudentTermForms, StudentClassChangeError, getStudentAcademicReadContext, getStudentClassChangeOptions } from "@school-clerk/db";
import { bulkChangeStudentClassSchema, changeStudentClassSchema,
  studentClassChangeOptionsSchema, type StudentClassChangeOptionsInput,
  type BulkChangeStudentClassInput, type ChangeStudentClassInput } from "@school-clerk/utils/student-class-change-schema";
import { canAccessModules, resolveModuleAccess } from "@school-clerk/utils/module-config";
import { TRPCError } from "@trpc/server";

export async function bulkChangeStudentClass(ctx: TRPCContext, input: BulkChangeStudentClassInput) {
  const data = bulkChangeStudentClassSchema.parse(input);
  const schoolId = ctx.profile.schoolId;
  const userId = ctx.currentUser?.id;
  const bearer = ctx.profile.authSessionId;
  if (!schoolId || !userId || !bearer) throw new TRPCError({ code: "UNAUTHORIZED", message: "A signed-in school workspace is required." });
  try {
    return await moveStudentTermForms(ctx.db, { schoolId, userId, bearer }, data);
  } catch (error) {
    if (error instanceof StudentClassChangeError) throw new TRPCError({ code: error.code, message: error.message });
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Class change could not be completed. Refresh to check placements before trying again." });
  }
}

export async function changeStudentClass(ctx: TRPCContext, input: ChangeStudentClassInput) {
  const data = changeStudentClassSchema.parse(input);
  return bulkChangeStudentClass(ctx, { studentTermFormIds: [data.studentTermFormId],
    classroomDepartmentId: data.classroomDepartmentId, viewScope: data.viewScope });
}

export async function readStudentClassChangeOptions(ctx: TRPCContext, input: StudentClassChangeOptionsInput) {
  const data = studentClassChangeOptionsSchema.parse(input);
  const schoolId = ctx.profile.schoolId;
  const userId = ctx.currentUser?.id;
  const bearer = ctx.profile.authSessionId;
  if (!schoolId || !userId || !bearer) throw new TRPCError({ code: "UNAUTHORIZED", message: "A signed-in school workspace is required." });
  try {
    return await ctx.db.$transaction(async (tx) => {
      const context = await getStudentAcademicReadContext(tx, { schoolId, userId, bearer });
      if (!context || !["ADMIN", "REGISTRAR"].includes(context.role?.toUpperCase() ?? "") ||
        !canAccessModules(resolveModuleAccess(context.school.moduleConfiguration), ["STUDENT_MANAGEMENT", "ACADEMIC_PROGRAMS"])) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Student and academic management access is required." });
      }
      const scope = { schoolId, userId, loginSessionId: context.loginSessionId };
      if (data.viewScope && (data.viewScope.schoolId !== schoolId || data.viewScope.userId !== userId || data.viewScope.loginSessionId !== scope.loginSessionId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Your class-change workspace changed. Refresh the page." });
      }
      return { ...await getStudentClassChangeOptions(tx, { schoolId, studentTermFormIds: data.studentTermFormIds }), scope };
    }, { isolationLevel: "RepeatableRead" });
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    if (error instanceof StudentClassChangeError) throw new TRPCError({ code: error.code, message: error.message });
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Class destinations could not be loaded. Refresh before continuing." });
  }
}
