import type { TRPCContext } from "@api/trpc/init";
import { softDeleteStudentTermForms, StudentTermRemovalError } from "@school-clerk/db";
import { bulkDeleteTermSheetsSchema, deleteTermSheetSchema, type BulkDeleteTermSheetsInput, type DeleteTermSheetInput } from "@school-clerk/utils/student-delete-schema";
import { TRPCError } from "@trpc/server";

export async function bulkDeleteTermSheets(ctx: TRPCContext, input: BulkDeleteTermSheetsInput) {
  const data = bulkDeleteTermSheetsSchema.parse(input);
  const schoolId = ctx.profile.schoolId;
  const userId = ctx.currentUser?.id;
  const bearer = ctx.profile.authSessionId;
  if (!schoolId || !userId || !bearer) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "A signed-in school workspace is required." });
  }
  try {
    return await softDeleteStudentTermForms(ctx.db, { schoolId, userId, bearer }, data);
  } catch (error) {
    if (error instanceof StudentTermRemovalError) throw new TRPCError({ code: error.code, message: error.message, cause: error });
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Enrollment removal could not be completed. Refresh the directory to check the records before trying again.", cause: error });
  }
}

export async function deleteTermSheet(ctx: TRPCContext, input: DeleteTermSheetInput) {
  const data = deleteTermSheetSchema.parse(input);
  return bulkDeleteTermSheets(ctx, { ids: [data.id], viewScope: data.viewScope });
}
