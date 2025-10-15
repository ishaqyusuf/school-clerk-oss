import type { TRPCContext } from "@api/trpc/init";
import type { GetStudentOverviewSchema } from "@api/trpc/schemas/schemas";
import { getStudent } from "./students";
import { getStudentTermsList } from "./academic-terms";

export async function studentsOverview(
  ctx: TRPCContext,
  query: GetStudentOverviewSchema
) {
  const { termSheetId, studentId } = query;
  const termSheet = await ctx.db.studentTermForm.findFirstOrThrow({
    where:
      termSheetId && studentId
        ? {
            OR: [
              {
                id: query.termSheetId!,
              },
              {
                studentId: query.studentId,
              },
            ],
          }
        : {
            studentId: query.studentId,
          },
    select: {
      id: true,
    },
  });
  const student = await getStudent(ctx, { studentId: query.studentId });
  const studentTerms = await getStudentTermsList(ctx, {
    studentId: query.studentId,
  });
  return {
    id: termSheet?.id,
    student,
    studentTerms,
  };
}
