import type { TRPCContext } from "@api/trpc/init";
import { softDeleteStudent, StudentDeletionError } from "@school-clerk/db";
import { deleteStudentSchema, type DeleteStudentInput } from "@school-clerk/utils/student-delete-schema";
import { TRPCError } from "@trpc/server";

export async function deleteStudent(ctx: TRPCContext, input: DeleteStudentInput) {
  const data = deleteStudentSchema.parse(input);
  const schoolId = ctx.profile.schoolId;
  const userId = ctx.currentUser?.id;
  const bearer = ctx.profile.authSessionId;
  if (!schoolId || !userId || !bearer) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "A signed-in school workspace is required." });
  }
  try {
    return await softDeleteStudent(ctx.db, { schoolId, userId, bearer }, data);
  } catch (error) {
    if (error instanceof StudentDeletionError) throw new TRPCError({ code: error.code, message: error.message, cause: error });
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Student deletion could not be completed. Refresh the directory to check the record before trying again.", cause: error });
  }
}
