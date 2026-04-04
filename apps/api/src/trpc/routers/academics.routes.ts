import { createTRPCRouter, publicProcedure } from "../init";
import {
  createAcademicSessionSchema,
  getStudentTermsListSchema,
} from "../schemas/schemas";

import {
  createAcademicSession,
  getStudentTermsList,
} from "@api/db/queries/academic-terms";
import {
  entrollStudentToTerm,
  entrollStudentToTermSchema,
} from "@api/db/queries/enrollment-query";
import {
  getClassroomDepartments,
  getClassroomsSchema,
} from "@api/db/queries/classroom";
import { z } from "zod";
import { applyFeeHistoriesToStudentTermForm } from "@api/db/queries/student-fee-application";
import {
  addYears,
  constructNow,
  differenceInDays,
  format,
  sub,
  subDays,
} from "date-fns";
import { consoleLog } from "@school-clerk/utils";

const previewApplicableFeeHistoriesSchema = z.object({
  sessionTermId: z.string(),
  classroomDepartmentId: z.string().optional().nullable(),
});

export const academicsRouter = createTRPCRouter({
  dashboard: publicProcedure.input(z.object({})).query(async (props) => {
    const { ctx, input } = props;
    const db = ctx.db;
    // return dashboard(props.ctx, props.input);
    const sessions = await db.schoolSession.findMany({
      where: {
        schoolId: ctx.profile.schoolId,
      },
      orderBy: {
        createdAt: {
          sort: "desc",
        },
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        terms: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            sessionId: true,
            title: true,
            startDate: true,
            endDate: true,
          },
          orderBy: {
            startDate: {
              sort: "asc",
              nulls: "first",
            },
          },
        },
      },
    });
    const now = new Date();
    // Current session is always the one stored in the auth cookie
    const currentSessionId = ctx.profile.sessionId;
    // sessions is ordered createdAt desc, so current is first, previous is next
    const currentSessionIdx = sessions.findIndex(
      (s) => s.id === currentSessionId,
    );
    const currentSession = sessions[currentSessionIdx];
    const previousSession = sessions[currentSessionIdx + 1];
    // Active term = most recently started non-null term within the current session
    const currentTerm =
      currentSession?.terms
        .filter((t) => t.startDate !== null)
        .sort((a, b) => b.startDate!.getTime() - a.startDate!.getTime())[0] ??
      null;

    // Promotion IDs — computed server-side from ordered data
    // firstTermId: first term of current session in insertion order (index 0, nulls-first = creation order)
    const promotionFirstTermId = currentSession?.terms[0]?.id ?? null;
    // lastTermId: most recently started term of previous session; fall back to last in array
    const promotionLastTermId =
      previousSession?.terms
        .filter((t) => t.startDate !== null)
        .sort((a, b) => b.startDate!.getTime() - a.startDate!.getTime())[0]
        ?.id ??
      previousSession?.terms[previousSession.terms.length - 1]?.id ??
      null;

    return {
      promotionIds:
        promotionFirstTermId && promotionLastTermId
          ? {
              lastTermId: promotionLastTermId,
              firstTermId: promotionFirstTermId,
            }
          : null,
      sessions: sessions.map((session) => {
        const isCurrent = session.id === currentSessionId;
        const duration =
          session.startDate && session.endDate
            ? `${format(session.startDate, "MMM yyyy")} - ${format(session.endDate, "MMM yyyy")}`
            : session.startDate
              ? `From ${format(session.startDate, "MMM yyyy")}`
              : "Not scheduled";
        return {
          id: session.id,
          currentTerm: isCurrent ? currentTerm : null,
          status: isCurrent
            ? "current"
            : !session.startDate
              ? "planning"
              : "archived",
          name: session.title,
          duration,
          activeTerm: isCurrent ? (currentTerm?.title ?? "Not started") : "—",
          terms: session.terms.map((term) => {
            const isCurrentTerm = currentTerm?.id === term.id;
            const isCompleted =
              !!term.endDate && differenceInDays(now, term.endDate) > 0;
            return {
              id: term.id,
              status: isCurrentTerm
                ? "current"
                : isCompleted
                  ? "completed"
                  : "upcoming",
              title: term.title,
              startDate: term.startDate,
              endDate: term.endDate,
            };
          }),
        };
      }),
    };
  }),
  getTermImportStat: publicProcedure
    .input(
      z.object({
        termId: z.string(),
      }),
    )
    .query(async (props) => {
      const { ctx, input } = props;
      const db = ctx.db;
      // get previous term data
      const terms = await db.sessionTerm.findMany({
        where: {
          schoolId: ctx.profile.schoolId,
        },
        select: {
          id: true,
          sessionId: true,
          title: true,
          session: {
            select: {
              title: true,
            },
          },
        },
        orderBy: {
          startDate: "desc",
        },
      });
      const currentTermIndex = terms.findIndex((t) => t.id === input.termId);
      const prevTermIndex = currentTermIndex + 1;
      const previousTermId = terms[prevTermIndex]!?.id;
      const promotional =
        terms[prevTermIndex]!?.sessionId !== terms[currentTermIndex]?.sessionId;

      // get previouse term data statistics
      const previousTerm = await db.sessionTerm.findFirstOrThrow({
        where: {
          id: previousTermId,
        },
        select: {
          id: true,
          // departmentSubjects: {},
          _count: {
            select: {
              departmentSubjects: {
                where: { deletedAt: null },
              },
              termForms: {
                where: { deletedAt: null },
              },
            },
          },
          session: {
            select: {
              _count: {
                select: {
                  classRooms: {
                    where: { deletedAt: null },
                  },
                },
              },
            },
          },
        },
      });
      if (!previousTermId || !previousTerm) {
        return { promotional, subjects: 0, students: 0, classrooms: 0 };
      }
      return {
        promotional,
        subjects: previousTerm._count.departmentSubjects,
        students: previousTerm._count.termForms,
        classrooms: previousTerm.session!._count.classRooms,
        previousTerm: terms?.[prevTermIndex || 0],
        sessionId: terms?.[currentTermIndex || 0]?.sessionId,
      };
      // return getTermImportData(props.ctx, props.input);
      // const term = await db.sessionTerm.findFirstOrThrow({
      //   where: {
      //     id: input.termId,
      //   },
      //   select: {
      //     id: true,
      //     title: true,
      //     departmentSubjects: {
      //       where: { deletedAt: null },
      //       select: {
      //         id: true,
      //         subject: {
      //           select: {
      //             id: true,
      //             name: true,
      //           },
      //         },
      //       },
      //     },
      //     termForms: {
      //       where: { deletedAt: null },
      //       select: {
      //         id: true,
      //         student: {
      //           select: {
      //             id: true,
      //             firstName: true,
      //             lastName: true,
      //             admissionNumber: true,
      //           },
      //         },
      //       },
      //     },
      //   },
      // });
      // return term;
    }),
  patchCreateMissingTermSession: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
      }),
    )
    .mutation(async (props) => {
      const { ctx, input } = props;
      const db = ctx.db;
      // return patchCreateMissingTermSession(props.ctx, props.input);
      return db.$transaction(async (tx) => {
        await tx.schoolSession.update({
          where: {
            id: input.sessionId,
          },
          data: {
            startDate: new Date(2025, 4, 2),
            terms: {
              create: {
                school: {
                  connect: {
                    id: ctx.profile.schoolId,
                  },
                },
                title: "3rd term",
                startDate: new Date(2025, 11, 22),
                // endDate: new Date(2026, )
              },
            },
          },
        });
      });
    }),
  getTermConfiguration: publicProcedure
    .input(
      z.object({
        termId: z.string(),
      }),
    )
    .query(async (props) => {
      const { ctx, input } = props;
      const db = ctx.db;
    }),
  saveTermMetaData: publicProcedure
    .input(
      z.object({
        termId: z.string(),
        startDate: z.date(),
        endDate: z.date().optional().nullable(),
      }),
    )
    .mutation(async (props) => {
      const { ctx, input } = props;
      const db = ctx.db;
      // return patchCreateMissingTermSession(props.ctx, props.input);
      return db.$transaction(async (tx) => {
        await tx.sessionTerm.update({
          where: {
            id: input.termId,
          },
          data: {
            startDate: input.startDate,
            endDate: input.endDate,
          },
        });
      });
    }),
  getStudentTermsList: publicProcedure
    .input(getStudentTermsListSchema)
    .query(async (props) => {
      return getStudentTermsList(props.ctx, props.input);
    }),
  createAcademicSession: publicProcedure
    .input(createAcademicSessionSchema)
    .mutation(async (props) => {
      return createAcademicSession(props.ctx, props.input);
    }),
  createAcademicTerm: publicProcedure
    .input(
      z.object({
        currentTermId: z.string(),
        currentSessionId: z.string(),
        title: z.string(),
        startDate: z.string().optional().nullable(),
        endDate: z.string().optional().nullable(),
      }),
    )
    .mutation(async (props) => {
      const { ctx, input } = props;
      const db = ctx.db;
      // return createAcademicTerm(props.ctx, props.input);
      const currentTerm = await db.sessionTerm.findFirstOrThrow({
        where: {
          id: input.currentTermId,
        },
        select: {
          departmentSubjects: {
            where: { deletedAt: null },
            select: {
              description: true,
              subjectId: true,
              classRoomDepartmentId: true,
              assessments: {
                where: { deletedAt: null },
                select: {
                  title: true,
                  index: true,
                  obtainable: true,
                  percentageObtainable: true,
                },
              },
            },
          },
          termForms: {
            where: { deletedAt: null },
            select: {
              studentId: true,
              studentSessionFormId: true,
              classroomDepartmentId: true,
            },
          },
        },
      });
      return db.$transaction(async (tx) => {
        const term = await tx.sessionTerm.create({
          data: {
            session: { connect: { id: input.currentSessionId } },
            school: { connect: { id: ctx.profile.schoolId } },
            title: input.title,
            startDate: input.startDate,
            endDate: input.endDate,
          },
        });
        const deptTermSubjects = await tx.departmentSubject.createManyAndReturn(
          {
            data: currentTerm?.departmentSubjects.map((ds) => ({
              subjectId: ds.subjectId,
              classRoomDepartmentId: ds.classRoomDepartmentId,
              description: ds.description,
              sessionTermId: term.id,
            })),
          },
        );
        await tx.classroomSubjectAssessment.createManyAndReturn({
          data: currentTerm?.departmentSubjects
            ?.map((d) => {
              const newDeptSubj = deptTermSubjects.find(
                (a) => a.subjectId === d.subjectId,
              );
              return d?.assessments?.map((assessment) => ({
                assessment,
                departmentSubject: d,
                newDeptSubj,
              }));
            })
            .flat()
            .map(({ assessment, departmentSubject, newDeptSubj }) => {
              const { obtainable, percentageObtainable, index, title } =
                assessment;
              return {
                obtainable,
                percentageObtainable,
                index,
                title,
                departmentSubjectId: newDeptSubj?.id,
              };
            }),
        });
        await tx.studentTermForm.createManyAndReturn({
          data: currentTerm.termForms.map(
            ({ studentId, studentSessionFormId, classroomDepartmentId }) => ({
              studentId,
              studentSessionFormId,
              classroomDepartmentId,
              schoolSessionId: term.sessionId,
              schoolProfileId: term.schoolId,
              sessionTermId: term.id,
            }),
          ),
        });
      });
    }),
  entrollStudentToTerm: publicProcedure
    .input(entrollStudentToTermSchema)
    .mutation(async (props) => {
      return entrollStudentToTerm(props.ctx, props.input);
    }),
  getClassrooms: publicProcedure
    .input(getClassroomsSchema)
    .query(async (props) => {
      return getClassroomDepartments(props.ctx, props.input);
    }),
  previewApplicableFeeHistories: publicProcedure
    .input(previewApplicableFeeHistoriesSchema)
    .query(async ({ ctx, input }) => {
      const feeHistories = await ctx.db.feeHistory.findMany({
        where: {
          termId: input.sessionTermId,
          current: true,
          deletedAt: null,
          fee: {
            schoolProfileId: ctx.profile.schoolId,
            deletedAt: null,
          },
          OR: [
            { classroomDepartments: { none: {} } },
            ...(input.classroomDepartmentId
              ? [
                  {
                    classroomDepartments: {
                      some: {
                        id: input.classroomDepartmentId,
                      },
                    },
                  },
                ]
              : []),
          ],
        },
        select: {
          id: true,
          amount: true,
          fee: {
            select: {
              title: true,
              description: true,
            },
          },
          wallet: {
            select: {
              id: true,
              name: true,
            },
          },
          classroomDepartments: {
            where: { deletedAt: null },
            select: { id: true },
          },
        },
        orderBy: [{ fee: { title: "asc" } }, { createdAt: "asc" }],
      });

      return feeHistories.map((feeHistory) => ({
        feeHistoryId: feeHistory.id,
        title: feeHistory.fee.title,
        description: feeHistory.fee.description,
        amount: feeHistory.amount,
        streamId: feeHistory.wallet?.id ?? null,
        streamName: feeHistory.wallet?.name ?? null,
        scope: feeHistory.classroomDepartments.length ? "classroom" : "general",
      }));
    }),
  migrateTermData: publicProcedure
    .input(
      z.object({
        termId: z.string(),
        sessionId: z.string(),
        previousTermId: z.string(),
        classroomOption: z.enum(["copy-all", "select", "empty"]),
        subjectOption: z.enum(["copy-all", "select", "empty"]),
        studentOption: z.enum(["copy-all", "select", "empty"]),
        autoPromote: z.boolean().optional().nullable(),
        selectedSubjectIds: z.array(z.string()).optional().nullable(),
      }),
    )
    .mutation(async (props) => {
      const { ctx, input } = props;
      const db = ctx.db;
      // return migrateTermData(props.ctx, props.input);
      return db.$transaction(async (tx) => {
        // Migrate Subjects
        await Promise.all([
          tx.departmentSubject.deleteMany({
            where: {
              sessionTermId: input.termId,
            },
          }),
          tx.studentTermForm.deleteMany({
            where: {
              sessionTermId: input.termId,
            },
          }),
        ]);

        const previousTermId = props.input.previousTermId;
        if (
          input.subjectOption === "copy-all" ||
          input.subjectOption === "select"
        ) {
          const previousTermSubjects = await tx.departmentSubject.findMany({
            where: {
              sessionTermId: previousTermId,
              // ...(input.subjectOption === "select" && {
              //   subjectId: { in: input.selectedSubjectIds || [] },
              // }),
            },
            select: {
              subjectId: true,
              classRoomDepartmentId: true,
              description: true,
              // assessments: {
              //   where: { deletedAt: null },
              //   select: {
              //     title: true,
              //     index: true,
              //     obtainable: true,
              //     percentageObtainable: true,
              //   },
              // },
            },
          });
          // const newDeptSubjects =
          const subjects = await tx.departmentSubject.createManyAndReturn({
            data: previousTermSubjects.map((ds) => ({
              subjectId: ds.subjectId,
              classRoomDepartmentId: ds.classRoomDepartmentId,
              description: ds.description,
              sessionTermId: input.termId,
            })),
          });
          // consoleLog("DEPARTMENT SUBJECTs", previousTermSubjects.length);
        }
        // Migrate Students
        if (input.studentOption === "copy-all") {
          // get previous term
          const previousTermForms = await tx.studentTermForm.findMany({
            where: {
              sessionTermId: previousTermId,
            },
            select: {
              studentId: true,
              studentSessionFormId: true,
              classroomDepartmentId: true,
            },
          });
          await tx.studentTermForm.createMany({
            data: previousTermForms.map(
              ({ studentId, studentSessionFormId, classroomDepartmentId }) => ({
                studentId,
                studentSessionFormId,
                classroomDepartmentId,
                schoolSessionId: input.sessionId,
                schoolProfileId: ctx.profile.schoolId,
                sessionTermId: input.termId,
              }),
            ),
          });
        }
        // throw new Error("Not implemented yet");
      });
    }),
  getSessionPrefill: publicProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const db = ctx.db;
      const latestSession = await db.schoolSession.findFirst({
        where: { schoolId: ctx.profile.schoolId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
          terms: {
            where: { deletedAt: null },
            orderBy: { startDate: { sort: "asc", nulls: "last" } },
            select: { id: true, title: true, startDate: true, endDate: true },
          },
        },
      });
      if (!latestSession) return null;

      const titleMatch = latestSession.title?.match(/^(\d{4})\/(\d{4})$/);
      const suggestedTitle = titleMatch
        ? `${parseInt(titleMatch[1]) + 1}/${parseInt(titleMatch[2]) + 1}`
        : latestSession.title
          ? `${latestSession.title} (New)`
          : "";

      const lastTerm =
        latestSession.terms[latestSession.terms.length - 1] ?? null;

      return {
        suggestedTitle,
        suggestedStartDate: latestSession.startDate
          ? addYears(latestSession.startDate, 1)
          : null,
        suggestedEndDate: latestSession.endDate
          ? addYears(latestSession.endDate, 1)
          : null,
        lastTermId: lastTerm?.id ?? null,
        previousTerms: latestSession.terms.map((t) => ({
          id: t.id,
          title: t.title,
          startDate: t.startDate ? addYears(t.startDate, 1) : null,
          endDate: t.endDate ? addYears(t.endDate, 1) : null,
        })),
      };
    }),
  getPromotionStudents: publicProcedure
    .input(
      z.object({
        lastTermId: z.string(),
        firstTermId: z.string(),
        classroomDepartmentId: z.string().optional().nullable(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db;

      const [lastTerm, firstTerm] = await Promise.all([
        db.sessionTerm.findFirst({
          where: { id: input.lastTermId },
          select: { title: true, session: { select: { title: true } } },
        }),
        db.sessionTerm.findFirst({
          where: { id: input.firstTermId },
          select: { title: true, session: { select: { title: true } } },
        }),
      ]);

      const lastTermForms = await db.studentTermForm.findMany({
        where: {
          sessionTermId: input.lastTermId,
          deletedAt: null,
          schoolProfileId: ctx.profile.schoolId,
          ...(input.classroomDepartmentId
            ? { classroomDepartmentId: input.classroomDepartmentId }
            : {}),
        },
        select: {
          id: true,
          studentId: true,
          classroomDepartmentId: true,
          student: {
            select: { id: true, name: true, surname: true },
          },
          classroomDepartment: {
            select: {
              id: true,
              departmentName: true,
              departmentLevel: true,
              classRoom: { select: { classLevel: true } },
            },
          },
          assessmentRecords: {
            where: { deletedAt: null },
            select: { obtained: true, percentageScore: true },
          },
        },
      });

      const promotedForms = await db.studentTermForm.findMany({
        where: {
          sessionTermId: input.firstTermId,
          deletedAt: null,
          schoolProfileId: ctx.profile.schoolId,
        },
        select: { studentId: true, id: true },
      });
      const promotedStudentIds = new Set(promotedForms.map((f) => f.studentId));
      const promotedFormMap = new Map(
        promotedForms.map((f) => [f.studentId, f.id]),
      );

      const students = lastTermForms.map((form) => {
        const scores = form.assessmentRecords
          .map((r) => r.percentageScore)
          .filter((s): s is number => s !== null);
        const avgScore =
          scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : null;
        return {
          termFormId: form.id,
          studentId: form.studentId!,
          name: [form.student?.name, form.student?.surname]
            .filter(Boolean)
            .join(" "),
          className: form.classroomDepartment?.departmentName ?? null,
          classroomDepartmentId: form.classroomDepartmentId!,
          classLevel: form.classroomDepartment?.classRoom?.classLevel ?? null,
          departmentLevel: form.classroomDepartment?.departmentLevel ?? null,
          avgScore,
          isPromoted: promotedStudentIds.has(form.studentId!),
          firstTermFormId: promotedFormMap.get(form.studentId!) ?? null,
        };
      });

      return {
        students,
        meta: {
          fromTerm: lastTerm?.title ?? null,
          fromSession: lastTerm?.session?.title ?? null,
          toTerm: firstTerm?.title ?? null,
          toSession: firstTerm?.session?.title ?? null,
        },
      };
    }),
  getStudentTermPerformance: publicProcedure
    .input(z.object({ studentId: z.string(), termId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = ctx.db;
      const termForm = await db.studentTermForm.findFirst({
        where: {
          studentId: input.studentId,
          sessionTermId: input.termId,
          deletedAt: null,
          schoolProfileId: ctx.profile.schoolId,
        },
        select: {
          id: true,
          classroomDepartment: {
            select: { departmentName: true },
          },
          sessionTerm: {
            select: {
              title: true,
              session: { select: { title: true } },
            },
          },
          student: { select: { name: true, surname: true } },
          assessmentRecords: {
            where: { deletedAt: null },
            select: {
              obtained: true,
              percentageScore: true,
              classSubjectAssessment: {
                select: {
                  title: true,
                  obtainable: true,
                  departmentSubject: {
                    select: {
                      subject: { select: { title: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });
      return termForm;
    }),
  batchPromote: publicProcedure
    .input(
      z.object({
        studentIds: z.array(z.string()),
        fromTermId: z.string(),
        toTermId: z.string(),
        toClassroomDepartmentId: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db;
      const toTerm = await db.sessionTerm.findFirstOrThrow({
        where: { id: input.toTermId },
        select: { id: true, sessionId: true, schoolId: true },
      });
      const sourceTermForms = await db.studentTermForm.findMany({
        where: {
          sessionTermId: input.fromTermId,
          studentId: { in: input.studentIds },
          deletedAt: null,
          schoolProfileId: ctx.profile.schoolId,
        },
        select: {
          studentId: true,
          classroomDepartmentId: true,
        },
      });

      return db.$transaction(async (tx) => {
        for (const form of sourceTermForms) {
          if (!form.studentId) continue;
          const targetClassroomDepartmentId =
            input.toClassroomDepartmentId ?? form.classroomDepartmentId;
          let sessionForm = await tx.studentSessionForm.findFirst({
            where: {
              studentId: form.studentId,
              schoolSessionId: toTerm.sessionId,
              deletedAt: null,
            },
            select: { id: true },
          });
          if (!sessionForm) {
            sessionForm = await tx.studentSessionForm.create({
              data: {
                studentId: form.studentId,
                schoolSessionId: toTerm.sessionId,
                schoolProfileId: ctx.profile.schoolId,
                classroomDepartmentId: targetClassroomDepartmentId,
              },
              select: { id: true },
            });
          }
          const existing = await tx.studentTermForm.findFirst({
            where: {
              studentId: form.studentId,
              sessionTermId: input.toTermId,
              deletedAt: null,
            },
          });
          if (!existing) {
            const termForm = await tx.studentTermForm.create({
              data: {
                studentId: form.studentId,
                studentSessionFormId: sessionForm.id,
                classroomDepartmentId: targetClassroomDepartmentId,
                schoolSessionId: toTerm.sessionId,
                schoolProfileId: ctx.profile.schoolId,
                sessionTermId: input.toTermId,
              },
            });

            await applyFeeHistoriesToStudentTermForm(tx, {
              schoolProfileId: ctx.profile.schoolId,
              studentId: form.studentId,
              studentTermFormId: termForm.id,
              schoolSessionId: toTerm.sessionId,
              sessionTermId: input.toTermId,
              classroomDepartmentId: targetClassroomDepartmentId,
            });
          }
        }
        return { promoted: sourceTermForms.length };
      });
    }),
  reversePromotion: publicProcedure
    .input(z.object({ studentId: z.string(), termId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db;
      await db.studentTermForm.updateMany({
        where: {
          studentId: input.studentId,
          sessionTermId: input.termId,
          deletedAt: null,
          schoolProfileId: ctx.profile.schoolId,
        },
        data: { deletedAt: new Date() },
      });
      return { success: true };
    }),
});
