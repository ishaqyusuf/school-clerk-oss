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
    return sessions.map((session) => {
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
    });
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
        const assessments =
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
        const termForms = await tx.studentTermForm.createManyAndReturn({
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
});
