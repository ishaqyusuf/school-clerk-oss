import type { TRPCContext } from "@api/trpc/init";
import { previewApplicableFeeHistoriesSchema, type PreviewApplicableFeeHistoriesInput } from "@api/schemas/student-fee-preview";
import { getStudentAcademicReadContext, getStudentFeePreview, StudentFeePreviewError } from "@school-clerk/db";
import { canAccessModules, resolveModuleAccess } from "@school-clerk/utils/module-config";
import { TRPCError } from "@trpc/server";

export async function previewApplicableFeeHistories(ctx: TRPCContext, input: PreviewApplicableFeeHistoriesInput) {
  const query = previewApplicableFeeHistoriesSchema.parse(input);
  const schoolId = ctx.profile.schoolId;
  const userId = ctx.currentUser?.id;
  const bearer = ctx.profile.authSessionId;
  if (!schoolId || !userId || !bearer) throw new TRPCError({ code: "UNAUTHORIZED", message: "A signed-in school workspace is required." });
  try {
    return await ctx.db.$transaction(async (tx) => {
      const context = await getStudentAcademicReadContext(tx, { schoolId, userId, bearer });
      if (!context || !["ADMIN", "REGISTRAR"].includes(context.role?.toUpperCase() ?? "") ||
        !canAccessModules(resolveModuleAccess(context.school.moduleConfiguration), ["STUDENT_MANAGEMENT", "ACADEMIC_PROGRAMS", "BILLING_FINANCE"])) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Fee preview requires student, academic and finance management access." });
      }
      if (query.viewScope && (query.viewScope.schoolId !== schoolId || query.viewScope.userId !== userId ||
        query.viewScope.loginSessionId !== context.loginSessionId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Fee preview workspace changed. Reload the page." });
      }
      return getStudentFeePreview(tx, { ...query, schoolId });
    }, { isolationLevel: "RepeatableRead" });
  } catch (error) {
    if (error instanceof StudentFeePreviewError) throw new TRPCError({ code: error.code, message: error.message, cause: error });
    throw error;
  }
}
