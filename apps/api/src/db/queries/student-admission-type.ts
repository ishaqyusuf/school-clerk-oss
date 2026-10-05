import type { TRPCContext } from "@api/trpc/init";
import { classifyStudentTermForms, StudentAdmissionTypeError } from "@school-clerk/db";
import { bulkSetStudentAdmissionTypeSchema, setStudentAdmissionTypeSchema,
  type BulkSetStudentAdmissionTypeInput, type SetStudentAdmissionTypeInput } from "@school-clerk/utils/student-admission-type-schema";
import { TRPCError } from "@trpc/server";

export async function bulkSetStudentAdmissionType(ctx: TRPCContext, input: BulkSetStudentAdmissionTypeInput) {
  const data = bulkSetStudentAdmissionTypeSchema.parse(input);
  const schoolId = ctx.profile.schoolId;
  const userId = ctx.currentUser?.id;
  const bearer = ctx.profile.authSessionId;
  if (!schoolId || !userId || !bearer) throw new TRPCError({ code: "UNAUTHORIZED", message: "A signed-in school workspace is required." });
  try {
    return await classifyStudentTermForms(ctx.db, { schoolId, userId, bearer }, data);
  } catch (error) {
    if (error instanceof StudentAdmissionTypeError) throw new TRPCError({ code: error.code, message: error.message });
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Admission classification could not be completed. Refresh to check statuses and balances before retrying." });
  }
}

export async function setStudentAdmissionType(ctx: TRPCContext, input: SetStudentAdmissionTypeInput) {
  const data = setStudentAdmissionTypeSchema.parse(input);
  return bulkSetStudentAdmissionType(ctx, { studentTermFormIds: [data.studentTermFormId], admissionType: data.admissionType, viewScope: data.viewScope });
}
