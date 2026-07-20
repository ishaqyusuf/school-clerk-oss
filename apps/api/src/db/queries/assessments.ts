import type { TRPCContext } from "@api/trpc/init";
import {
	type SaveAssessementSchema,
  getScoreKey,
  saveAssessementSchema,
} from "@school-clerk/assessment-results";
import { saveStudentAssessmentScoreWithHistory } from "@school-clerk/db";
import { generateRandomString, uniqueList } from "@school-clerk/utils";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { runAssessmentScoreTransactionWithRetry } from "../../lib/assessment-score-history";
import {
  assertTeacherCanAccessAssessment,
  assertTeacherCanAccessDepartmentSubject,
} from "../../lib/teacher-authorization";
import { assertAcademicTermWritable } from "./academic-term-setup";
import { studentDisplayName } from "./enrollment-query";

export { saveAssessementSchema } from "@school-clerk/assessment-results";

export async function saveAssessement(
  ctx: TRPCContext,
  data: SaveAssessementSchema,
) {
  await assertTeacherCanAccessDepartmentSubject(ctx, data.departmentSubjectId);
  await assertTeacherCanAccessAssessment(ctx, data.id);
  const writableSubject = await ctx.db.departmentSubject.findFirst({
    where: {
      id: data.departmentSubjectId,
      deletedAt: null,
      classRoomDepartment: {
        schoolProfileId: ctx.profile.schoolId,
      },
    },
    select: { sessionTermId: true },
  });
  await assertAcademicTermWritable(ctx, writableSubject?.sessionTermId);

  const { db } = ctx;
  const {
    id,
    title,
    obtainable,
    index,
    percentageObtainable,
    departmentSubjectId,
    parentAssessmentId,
    childAssessments,
    isGroup,
    printMode,
  } = data;
  const normalizedChildren = childAssessments ?? [];
  const groupedAssessment = isGroup || normalizedChildren.length > 0;
  const assessmentPrintMode =
    groupedAssessment && printMode === "total" ? "TOTAL" : "EXPANDED";
  const summaryObtainable = groupedAssessment
		? normalizedChildren.reduce(
				(sum, child) => sum + (child.obtainable ?? 0),
				0,
			)
    : obtainable;
  const summaryPercentage = groupedAssessment
    ? normalizedChildren.reduce(
        (sum, child) => sum + (child.percentageObtainable ?? 0),
        0,
      )
    : percentageObtainable;

  return db.$transaction(async (tx) => {
    const assessment = id
      ? await tx.classroomSubjectAssessment.update({
          where: { id },
          data: {
            title,
            obtainable: summaryObtainable,
            percentageObtainable: summaryPercentage,
            isGroup: groupedAssessment,
            printMode: assessmentPrintMode,
            parentAssessmentId: parentAssessmentId ?? null,
            deletedAt: null,
          },
        })
      : await tx.classroomSubjectAssessment.create({
          data: {
            title,
            obtainable: summaryObtainable,
            index,
            percentageObtainable: summaryPercentage,
            departmentSubjectId,
            isGroup: groupedAssessment,
            printMode: assessmentPrintMode,
            parentAssessmentId: parentAssessmentId ?? null,
          },
        });

    const existingChildren = await tx.classroomSubjectAssessment.findMany({
      where: {
        parentAssessmentId: assessment.id,
      },
      select: {
        id: true,
      },
    });

    const incomingChildIds = normalizedChildren
      .map((child) => child.id)
      .filter((childId): childId is number => typeof childId === "number");
    const existingChildIds = new Set(existingChildren.map((child) => child.id));
    const invalidChildIds = incomingChildIds.filter(
      (childId) => !existingChildIds.has(childId),
    );

    if (invalidChildIds.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "One or more sub-assessments do not belong to this grouped assessment.",
      });
    }

    if (groupedAssessment) {
      await Promise.all(
        normalizedChildren.map((child, childIndex) => {
          const childData = {
            title: child.title,
            obtainable: child.obtainable,
            percentageObtainable: child.percentageObtainable,
            index: childIndex,
            departmentSubjectId,
            isGroup: false,
            printMode: "EXPANDED" as const,
            parentAssessmentId: assessment.id,
            deletedAt: null,
          };

          if (child.id) {
            return tx.classroomSubjectAssessment.update({
              where: { id: child.id },
              data: childData,
            });
          }

          return tx.classroomSubjectAssessment.create({
            data: childData,
          });
        }),
      );
    }

    const removedChildIds = existingChildren
      .map((child) => child.id)
      .filter((childId) => !incomingChildIds.includes(childId));

    if (removedChildIds.length) {
      await tx.classroomSubjectAssessment.updateMany({
        where: {
          id: {
            in: removedChildIds,
          },
        },
        data: {
          deletedAt: new Date(),
        },
      });
    }

    if (!groupedAssessment && existingChildren.length) {
      await tx.classroomSubjectAssessment.updateMany({
        where: {
          parentAssessmentId: assessment.id,
        },
        data: {
          deletedAt: new Date(),
        },
      });
    }

    return assessment;
  });
}

export const deleteAssessmentSchema = z.object({
  id: z.number(),
});
export type DeleteAssessmentSchema = z.infer<typeof deleteAssessmentSchema>;

export async function deleteAssessment(
  ctx: TRPCContext,
  data: DeleteAssessmentSchema,
) {
  await assertTeacherCanAccessAssessment(ctx, data.id);
  const writableAssessment =
    await ctx.db.classroomSubjectAssessment.findFirst({
      where: {
        id: data.id,
        deletedAt: null,
        departmentSubject: {
          classRoomDepartment: {
            schoolProfileId: ctx.profile.schoolId,
          },
        },
      },
      select: {
        departmentSubject: {
          select: { sessionTermId: true },
        },
      },
    });
  await assertAcademicTermWritable(
    ctx,
    writableAssessment?.departmentSubject?.sessionTermId,
  );

  const deletedAt = new Date();
  return ctx.db.$transaction(async (tx) => {
    await tx.classroomSubjectAssessment.updateMany({
      where: {
        parentAssessmentId: data.id,
      },
      data: {
        deletedAt,
      },
    });

    return tx.classroomSubjectAssessment.update({
      where: {
        id: data.id,
      },
      data: {
        deletedAt,
      },
    });
  });
}

export const reorderAssessmentsSchema = z.object({
  departmentSubjectId: z.string(),
  assessmentIds: z.array(z.number()),
});
export type ReorderAssessmentsSchema = z.infer<typeof reorderAssessmentsSchema>;

export async function reorderAssessments(
  ctx: TRPCContext,
  data: ReorderAssessmentsSchema,
) {
  await assertTeacherCanAccessDepartmentSubject(ctx, data.departmentSubjectId);
  const writableSubject = await ctx.db.departmentSubject.findFirst({
    where: {
      id: data.departmentSubjectId,
      deletedAt: null,
      classRoomDepartment: {
        schoolProfileId: ctx.profile.schoolId,
      },
    },
    select: { sessionTermId: true },
  });
  await assertAcademicTermWritable(ctx, writableSubject?.sessionTermId);

  return ctx.db.$transaction(
    data.assessmentIds.map((id, index) =>
      ctx.db.classroomSubjectAssessment.updateMany({
        where: {
          id,
          departmentSubjectId: data.departmentSubjectId,
          parentAssessmentId: null,
          deletedAt: null,
        },
        data: {
          index,
        },
      }),
    ),
  );
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
  termId: z.string().optional().nullable(),
  assessmentIds: z.array(z.number()).optional().nullable(),
});
export type GetSubjectAssessmentRecordingsSchema = z.infer<
  typeof getSubjectAssessmentRecordingsSchema
>;

export async function getSubjectAssessmentRecordings(
  ctx: TRPCContext,
  query: GetSubjectAssessmentRecordingsSchema,
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
              deletedAt: null,
              isGroup: false,
              id: {
                in: query.assessmentIds,
              },
            }
          : {
              deletedAt: null,
              isGroup: false,
            },
        select: {
          id: true,
          obtainable: true,
          percentageObtainable: true,
          title: true,
          index: true,
          parentAssessment: {
            select: {
              id: true,
              title: true,
            },
          },
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

  await assertTeacherCanAccessDepartmentSubject(
    ctx,
    query.deparmentSubjectId,
    ds.sessionTermId,
  );

  const studentTermForms = await db.studentTermForm.findMany({
    where: {
      sessionTermId: ds?.sessionTermId,
      classroomDepartmentId: ds.classRoomDepartmentId,
      student: {
        deletedAt: null,
      },
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
    orderBy: [
      {
        student: {
          gender: "asc",
        },
      },
      {
        student: {
          name: "asc",
        },
      },
    ],
  });

  const data = {
    departmentId: ds.id,
    sessionTermId: ds.sessionTermId,
    students: studentTermForms.map((s) => ({
      termId: s.id,
      id: s.student?.id,
			name: studentDisplayName(s.student as any, ctx.profile.studentNameFormat),
      assessments: ds.assessments.map((a) => {
        const result = a.assessmentResults.find(
          (r) => r.studentTermFormId === s.id,
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
      parentTitle: a.parentAssessment?.title,
      displayTitle: a.parentAssessment?.title
        ? `${a.parentAssessment.title} - ${a.title}`
        : a.title,
      obtainable: a.obtainable,
      percentageObtainable: a.percentageObtainable,
      index: a.index,
    })),
  };
  const scores = Object.fromEntries(
    data.students.flatMap((s) => s.assessments).map((a) => [a.scoreKey, a]),
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
  obtained: z.number().finite().min(0).optional().nullable(),
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
  data: UpdateAssessmentScoreSchema,
) {
  const schoolProfileId = ctx.profile.schoolId;
  if (!schoolProfileId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Select a school before recording assessment scores.",
    });
  }
  await assertTeacherCanAccessAssessment(ctx, data.assessmentId);

  const assessment = await ctx.db.classroomSubjectAssessment.findFirst({
    where: {
      id: data.assessmentId,
      deletedAt: null,
    },
    select: {
      isGroup: true,
      obtainable: true,
      departmentSubject: {
        select: {
          classRoomDepartmentId: true,
          sessionTermId: true,
        },
      },
    },
  });

  if (!assessment || assessment.isGroup) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Scores can only be recorded against scoreable assessments.",
    });
  }

  if (
    data.obtained != null &&
    assessment.obtainable != null &&
    data.obtained > assessment.obtainable
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Score cannot be greater than the assessment maximum.",
    });
  }

  const studentTermForm = await ctx.db.studentTermForm.findFirst({
    where: {
      id: data.studentTermId,
      deletedAt: null,
    },
    select: {
      classroomDepartmentId: true,
      sessionTermId: true,
      schoolProfileId: true,
    },
  });

  if (
    !assessment?.departmentSubject?.classRoomDepartmentId ||
    !studentTermForm?.classroomDepartmentId ||
    assessment.departmentSubject.classRoomDepartmentId !==
      studentTermForm.classroomDepartmentId
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This score does not belong to the selected classroom subject.",
    });
  }
  if (
    !assessment.departmentSubject.sessionTermId ||
    assessment.departmentSubject.sessionTermId !==
      studentTermForm.sessionTermId ||
    studentTermForm.schoolProfileId !== schoolProfileId
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This score does not belong to the selected academic term.",
    });
  }
  await assertAcademicTermWritable(ctx, studentTermForm.sessionTermId);

  return runAssessmentScoreTransactionWithRetry(() =>
    ctx.db.$transaction(
      async (tx) => {
        const currentRecord = data.id
          ? await tx.studentAssessmentRecord.findFirst({
              where: {
                id: data.id,
                classSubjectAssessmentId: data.assessmentId,
                studentId: data.studentId,
                studentTermFormId: data.studentTermId,
                deletedAt: null,
              },
              select: {
                id: true,
                obtained: true,
              },
            })
          : await tx.studentAssessmentRecord.findUnique({
              where: {
                studentId_studentTermFormId_classSubjectAssessmentId: {
                  studentId: data.studentId,
                  studentTermFormId: data.studentTermId,
                  classSubjectAssessmentId: data.assessmentId,
                },
              },
              select: {
                id: true,
                obtained: true,
              },
            });

        if (data.id && !currentRecord) {
          throw new TRPCError({
            code: "BAD_REQUEST",
						message:
							"This score record does not match the selected student and assessment.",
          });
        }

        return saveStudentAssessmentScoreWithHistory({
          db: tx,
          currentRecord,
          score: {
            classSubjectAssessmentId: data.assessmentId,
            obtained: data.obtained ?? null,
            studentId: data.studentId,
            studentTermFormId: data.studentTermId,
          },
          history: {
            schoolProfileId,
            source: "AUTHENTICATED_ENTRY",
            actorUserId: ctx.currentUser?.id,
            actorName: ctx.currentUser?.name,
            metadata: {
              departmentId: data.departmentId,
            },
          },
        });
      },
      { isolationLevel: "Serializable" },
    ),
  );
}
export const getAssessmentSuggestionsSchema = z.object({
  deptSubjectId: z.string().optional().nullable(),
});
export type GetAssessmentSuggestionsSchema = z.infer<
  typeof getAssessmentSuggestionsSchema
>;

export async function getAssessmentSuggestions(
  ctx: TRPCContext,
  query: GetAssessmentSuggestionsSchema,
) {
  const { db } = ctx;
  const list = await db.classroomSubjectAssessment.findMany({
    where: {
      deletedAt: null,
      isGroup: false,
    },
    select: {
      obtainable: true,
      percentageObtainable: true,
      title: true,
      departmentSubjectId: true,
    },
  });
  const uList = uniqueList(list, "title", "obtainable", "percentageObtainable");
  return uList
    .filter((a) => {
      if (a.departmentSubjectId === query?.deptSubjectId) return false;
      if (
        list.some((b) => {
          const match = ["obtainable", "percentageObtainable", "title"].every(
            (c) => a[c] === b[c],
          );
          return match && b.departmentSubjectId === query?.deptSubjectId;
        })
      )
        return false;
      return true;
    })
    .map((a) => ({
      ...a,
      uid: generateRandomString(5),
    }));
}
