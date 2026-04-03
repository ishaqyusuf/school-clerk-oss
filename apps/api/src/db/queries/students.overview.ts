import type { TRPCContext } from "@api/trpc/init";
import type { GetStudentOverviewSchema } from "@api/trpc/schemas/schemas";
import { getStudentTermsList } from "./academic-terms";
import { studentDisplayName } from "./enrollment-query";

export async function studentsOverview(
  ctx: TRPCContext,
  query: GetStudentOverviewSchema
) {
  const { termSheetId, studentId } = query;
  const [termSheet, studentRecord, studentTerms] = await Promise.all([
    ctx.db.studentTermForm.findFirst({
      where: termSheetId
        ? {
            id: termSheetId,
            studentId,
            deletedAt: null,
          }
        : {
            studentId,
            deletedAt: null,
          },
      select: {
        id: true,
      },
    }),
    ctx.db.students.findFirstOrThrow({
      where: {
        id: studentId,
      },
      select: {
        id: true,
        name: true,
        surname: true,
        otherName: true,
        gender: true,
      },
    }),
    getStudentTermsList(ctx, {
      studentId,
    }),
  ]);

  const student = {
    id: studentRecord.id,
    gender: studentRecord.gender,
    studentName: studentDisplayName(studentRecord),
  };

  return {
    id: termSheet?.id,
    student,
    studentTerms,
  };
}
