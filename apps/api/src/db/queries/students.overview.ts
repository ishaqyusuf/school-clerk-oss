import type { TRPCContext } from "@api/trpc/init";
import type { GetStudentOverviewSchema } from "@api/trpc/schemas/schemas";
import { getStudentTermsList } from "./academic-terms";
import { studentDisplayName } from "./enrollment-query";

export async function studentsOverview(
  ctx: TRPCContext,
  query: GetStudentOverviewSchema,
) {
  const { termSheetId, studentId } = query;
  const [termSheet, studentRecord, studentTerms] = await Promise.all([
    ctx.db.studentTermForm.findFirst({
      where: termSheetId
        ? {
            id: termSheetId,
            studentId,
            schoolProfileId: ctx.profile.schoolId,
            deletedAt: null,
          }
        : {
            studentId,
            schoolProfileId: ctx.profile.schoolId,
            deletedAt: null,
          },
      select: {
        id: true,
      },
    }),
    ctx.db.students.findFirstOrThrow({
      where: {
        id: studentId,
        schoolProfileId: ctx.profile.schoolId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        surname: true,
        otherName: true,
        dob: true,
        gender: true,
        guardians: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            createdAt: "asc",
          },
          take: 1,
          select: {
            guardian: {
              select: {
                id: true,
                name: true,
                phone: true,
                phone2: true,
              },
            },
          },
        },
      },
    }),
    getStudentTermsList(ctx, {
      studentId,
    }),
  ]);

  const student = {
    id: studentRecord.id,
    name: studentRecord.name,
    surname: studentRecord.surname,
    otherName: studentRecord.otherName,
    dob: studentRecord.dob,
    gender: studentRecord.gender,
    guardian: studentRecord.guardians[0]?.guardian ?? null,
    studentName: studentDisplayName(studentRecord),
  };

  return {
    id: termSheet?.id,
    student,
    studentTerms,
  };
}
