import type { TRPCContext } from "@api/trpc/init";
import { entrollStudentToTermSchema, type EntrollStudentToTerm } from "@school-clerk/assessment-results";
import { enrollStudentInAcademicTerm, StudentTermEnrollmentError } from "@school-clerk/db";
import { TRPCError } from "@trpc/server";

export async function enrollStudentToTerm(ctx: TRPCContext, input: EntrollStudentToTerm) {
  const data = entrollStudentToTermSchema.parse(input);
  const schoolId = ctx.profile.schoolId;
  const userId = ctx.currentUser?.id;
  const bearer = ctx.profile.authSessionId;
  if (!schoolId || !userId || !bearer) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "A signed-in school workspace is required." });
  }
  try {
    return await enrollStudentInAcademicTerm(ctx.db, { schoolId, userId, bearer }, data);
  } catch (error) {
    if (error instanceof StudentTermEnrollmentError) {
      throw new TRPCError({ code: error.code, message: error.message, cause: error });
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") {
      throw new TRPCError({ code: "CONFLICT", message: "Enrollment changed concurrently. Refresh history before trying again.", cause: error });
    }
    throw error;
  }
}
