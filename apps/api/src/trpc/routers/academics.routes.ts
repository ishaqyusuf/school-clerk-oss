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

export const academicsRouter = createTRPCRouter({
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
            select: {
              description: true,
              subjectId: true,
              classRoomDepartmentId: true,
            },
          },
          termForms: {
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
            departmentSubjects: {
              createMany: {
                data: currentTerm?.departmentSubjects.map((ds) => ({
                  subjectId: ds.subjectId,
                  classRoomDepartmentId: ds.classRoomDepartmentId,
                  description: ds.description,
                })),
              },
            },
            termForms: {
              createMany: {
                data: currentTerm.termForms.map(
                  ({
                    studentId,
                    studentSessionFormId,
                    classroomDepartmentId,
                  }) => ({
                    studentId,
                    studentSessionFormId,
                    classroomDepartmentId,
                  }),
                ),
              },
            },
          },
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
