import type { TRPCContext } from "@api/trpc/init";
import { z } from "zod";
import { overview } from "./subjects";
import { studentDisplayName } from "./enrollment-query";

export const saveAssessementSchema = z.object({
  id: z.number().optional().nullable(),
  title: z.string(),
  obtainable: z.number(),
  index: z.number(),
  percentageObtainable: z.number(),
  departmentSubjectId: z.string(),
});
export type SaveAssessementSchema = z.infer<typeof saveAssessementSchema>;

export async function saveAssessement(
  ctx: TRPCContext,
  data: SaveAssessementSchema
) {
  const { db } = ctx;
  const {
    id,
    title,
    obtainable,
    index,
    percentageObtainable,
    departmentSubjectId,
  } = data;
  if (id) {
    await ctx.db.classroomSubjectAssessment.update({
      where: { id },
      data: {
        title,
        obtainable,
        percentageObtainable,
      },
    });
  } else
    await ctx.db.classroomSubjectAssessment.create({
      data: {
        title,
        obtainable,
        index,
        percentageObtainable,
        departmentSubjectId,
      },
    });
}

/*
getSubjectAssessmentRecordings: publicProcedure
      .input(getSubjectAssessmentRecordingsSchema)
      .query(async (props) => {
        return getSubjectAssessmentRecordings(props.ctx, props.input);
      }),
*/
export const getSubjectAssessmentRecordingsSchema = z.object({
  deparmentSubjectId: z.string(),
  assessmentIds: z.array(z.number()).optional().nullable(),
});
export type GetSubjectAssessmentRecordingsSchema = z.infer<
  typeof getSubjectAssessmentRecordingsSchema
>;

export async function getSubjectAssessmentRecordings(
  ctx: TRPCContext,
  query: GetSubjectAssessmentRecordingsSchema
) {
  const { db } = ctx;
  const ds = await db.departmentSubject.findUniqueOrThrow({
    where: {
      id: query.deparmentSubjectId,
    },
    select: {
      id: true,
      sessionTermId: true,
      classRoomDepartmentId: true,
      assessments: {
        where: query.assessmentIds?.length
          ? {
              id: {
                in: query.assessmentIds,
              },
            }
          : undefined,
        select: {
          id: true,
          obtainable: true,
          percentageObtainable: true,
          title: true,
          index: true,
          assessmentResults: {
            select: {
              id: true,
              obtained: true,
              percentageScore: true,
              studentTermFormId: true,
            },
          },
        },
      },
    },
  });
  const studentTermForms = await db.studentTermForm.findMany({
    where: {
      sessionTermId: ds?.sessionTermId,
      classroomDepartmentId: ds.classRoomDepartmentId,
    },
    select: {
      id: true,
      student: {
        select: {
          id: true,
          name: true,
          otherName: true,
          surname: true,
        },
      },
    },
  });

  const data = {
    departmentId: ds.id,
    sessionTermId: ds.sessionTermId,
    students: studentTermForms.map((s) => ({
      termId: s.id,
      id: s.student?.id,
      name: studentDisplayName(s.student as any),
      assessments: ds.assessments.map((a) => {
        const result = a.assessmentResults.find(
          (r) => r.studentTermFormId === s.id
        );
        return {
          id: result?.id,
          assessmentId: a.id,
          obtained: result?.obtained ?? null,
          percentageObtained: result?.percentageScore ?? null,
          scoreKey: getScoreKey(a.id, s.id),

          //`${s.id}-${a.id}`, // termId + assessmentId
        };
      }),
    })),
    assessments: ds.assessments.map((a) => ({
      id: a.id,
      title: a.title,
      obtainable: a.obtainable,
      percentageObtainable: a.percentageObtainable,
      index: a.index,
    })),
  };
  const scores = Object.fromEntries(
    data.students.flatMap((s) => s.assessments).map((a) => [a.scoreKey, a])
  );
  const students = data.students.map(({ assessments, ...student }) => ({
    ...student,
  }));
  return {
    ...data,
    students,
    scores,
  };
}
export const updateAssessmentScoreSchema = z.object({
  id: z.number().optional().nullable(),
  obtained: z.number().optional().nullable(),
  assessmentId: z.number(),
  studentTermId: z.string(),
  studentId: z.string(),
  departmentId: z.string(),
});
export type UpdateAssessmentScoreSchema = z.infer<
  typeof updateAssessmentScoreSchema
>;

export async function updateAssessmentScore(
  ctx: TRPCContext,
  data: UpdateAssessmentScoreSchema
) {
  const { db } = ctx;
  if (data.id) {
    const resp = await ctx.db.studentAssessmentRecord.update({
      where: { id: data.id },
      data: {
        obtained: data.obtained,
      },
      select: {
        id: true,
        obtained: true,
      },
    });
    return resp;
  }
  const resp = await ctx.db.studentAssessmentRecord.create({
    data: {
      classSubjectAssessmentId: data.assessmentId,
      obtained: data.obtained,
      studentId: data.studentId,
      studentTermFormId: data.studentTermId,
    },
    select: {
      id: true,
      obtained: true,
    },
  });
  return resp;
}
export function getScoreKey(assessmentId, studentTermId) {
  return `${assessmentId}-${studentTermId}`;
}
