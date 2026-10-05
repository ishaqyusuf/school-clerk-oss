"use server";

import { revalidatePath } from "next/cache";
import { prisma, softDeleteStudent, StudentDeletionError } from "@school-clerk/db";
import { deleteStudentSchema, type DeleteStudentInput } from "@school-clerk/utils/student-delete-schema";
import { requireDashboardModules } from "@/lib/module-access";
import { actionClient } from "./safe-action";

export type Data = DeleteStudentInput;

export async function deleteStudent(input: DeleteStudentInput) {
  const data = deleteStudentSchema.parse(input);
  const context = await requireDashboardModules(["STUDENT_MANAGEMENT"], ["Admin", "Registrar"]);
  let result: Awaited<ReturnType<typeof softDeleteStudent>>;
  try {
    result = await softDeleteStudent(prisma, {
      schoolId: context.profile.schoolId, userId: context.user.id, bearer: context.authSessionId,
    }, data);
  } catch (error) {
    if (error instanceof StudentDeletionError) throw error;
    throw new Error("Student deletion could not be completed. Refresh the directory to check the record before trying again.");
  }
  // Invalidate only after the shared transaction has committed.
  revalidatePath("/students/list");
  return result;
}

export const deleteStudentAction = actionClient
  .schema(deleteStudentSchema)
  .action(async ({ parsedInput }) => deleteStudent(parsedInput));
