import type { TRPCContext } from "@api/trpc/init";
import { updateStudentProfile, StudentFeeReconciliationError } from "@school-clerk/db";
import { changeStudentGenderSchema, updateStudentBasicProfileSchema,
  type ChangeStudentGenderInput, type UpdateStudentBasicProfileInput, type StudentProfileUpdateInput } from "@school-clerk/utils/student-profile-schema";
import { TRPCError } from "@trpc/server";

async function saveProfile(ctx: TRPCContext, data: StudentProfileUpdateInput) {
  const schoolId = ctx.profile.schoolId;
  const userId = ctx.currentUser?.id;
  const bearer = ctx.profile.authSessionId;
  if (!schoolId || !userId || !bearer) throw new TRPCError({ code: "UNAUTHORIZED", message: "A signed-in school workspace is required." });
  try { return await updateStudentProfile(ctx.db, { schoolId, userId, bearer }, data); }
  catch (error) {
    if (error instanceof StudentFeeReconciliationError) throw new TRPCError({ code: error.code, message: error.message });
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Student update could not be completed. Refresh and check the profile and fees before retrying." });
  }
}
export function updateStudentBasicProfile(ctx: TRPCContext, input: UpdateStudentBasicProfileInput) {
  return saveProfile(ctx, updateStudentBasicProfileSchema.parse(input));
}
export function changeStudentGender(ctx: TRPCContext, input: ChangeStudentGenderInput) {
  return saveProfile(ctx, changeStudentGenderSchema.parse(input));
}
