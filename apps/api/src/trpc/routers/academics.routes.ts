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
import { constructNow, differenceInDays, sub, subDays } from "date-fns";

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
    const currentTerm = sessions
      .map((a) => a.terms)
      .flat()
      .find((a) => {
        return !a.endDate || differenceInDays(new Date(), a.endDate) > 0;
      });
    return {
      sessions: sessions.map((session) => {
        const isCurrent = currentTerm?.sessionId == session.id;
        return {
          id: session.id,
          currentTerm: isCurrent ? currentTerm : null,
          status: isCurrent
            ? "current"
            : !session.startDate
              ? "planning"
              : "archived",
          name: session.title,
          duration: `Sept 2023 - Jul 2024`,
          activeTerm: "Not started", // "x term ended"
          terms: session.terms.map((term) => {
            return {
              id: term.id,
              status: currentTerm?.id == term.id ? "current" : "upcoming",
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
        const previousTermId = props.input.previousTermId;
        if (
          input.subjectOption === "copy-all" ||
          input.subjectOption === "select"
        ) {
          const previousTermSubjects = await tx.departmentSubject.findMany({
            where: {
              sessionTermId: previousTermId,
              ...(input.subjectOption === "select" && {
                subjectId: { in: input.selectedSubjectIds || [] },
              }),
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
          const newDeptSubjects =
            await tx.departmentSubject.createManyAndReturn({
              data: previousTermSubjects.map((ds) => ({
                subjectId: ds.subjectId,
                classRoomDepartmentId: ds.classRoomDepartmentId,
                description: ds.description,
                sessionTermId: input.termId,
              })),
            });
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
        throw new Error("Not implemented yet");
      });
    }),
});
