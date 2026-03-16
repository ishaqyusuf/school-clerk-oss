import { z } from "@hono/zod-openapi";
import { createTRPCRouter, publicProcedure } from "../init";
import { classroomQuerySchema, questionQuerySchema } from "../schemas/schemas";

import { loadQuestions } from "@api/db/queries/questions";
import {
  getClassroomOverview,
  getClassroomOverviewSchema,
  getClassrooms,
} from "@api/db/queries/classroom";

const createClassroomSchema = z.object({
  className: z.string().min(1),
  departments: z
    .array(
      z.object({
        name: z.string(),
        departmentLevel: z.number().optional().nullable(),
      })
    )
    .optional(),
});

export const classroomRouter = createTRPCRouter({
  createClassroom: publicProcedure
    .input(createClassroomSchema)
    .mutation(async ({ input, ctx }) => {
      const { sessionId, schoolId } = ctx.profile;
      if (!input.departments?.length) {
        input.departments = [{ name: input.className }];
      }
      return ctx.db.classRoom.upsert({
        where: {
          schoolSessionId_name: {
            name: input.className,
            schoolSessionId: sessionId!,
          },
        },
        update: {
          classRoomDepartments: {
            createMany: {
              data: input.departments.map((d) => ({
                departmentName: d.name,
                schoolProfileId: schoolId,
                departmentLevel: d.departmentLevel,
              })),
              skipDuplicates: true,
            },
          },
        },
        create: {
          name: input.className,
          schoolSessionId: sessionId!,
          schoolProfileId: schoolId!,
          classRoomDepartments: {
            createMany: {
              data: input.departments.map((d) => ({
                departmentName: d.name,
                schoolProfileId: schoolId,
                departmentLevel: d.departmentLevel,
              })),
            },
          },
        },
        include: { classRoomDepartments: true },
      });
    }),

  deleteClassroomDepartment: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.db.$transaction(async (tx) => {
        const resp = await tx.classRoomDepartment.update({
          where: { id: input.id },
          data: { deletedAt: new Date() },
          select: {
            classRoom: {
              select: {
                id: true,
                _count: {
                  select: {
                    classRoomDepartments: { where: { deletedAt: null } },
                  },
                },
              },
            },
          },
        });
        const classRoom = resp?.classRoom;
        if (!classRoom?._count?.classRoomDepartments && classRoom?.id) {
          await tx.classRoom.update({
            where: { id: classRoom.id },
            data: { deletedAt: new Date() },
          });
        }
        return { success: true };
      });
    }),

  all: publicProcedure
    .input(classroomQuerySchema)
    .query(async ({ input, ctx }) => {
      if (!input.schoolSessionId) input.schoolSessionId = ctx.profile.sessionId;
      const result = await getClassrooms(ctx, input);
      return result;
    }),
  deleteClassroomTermDepartment: publicProcedure
    .input(z.object({ departmentId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.db.classRoomDepartment.update({
        where: {
          id: input.departmentId,
          // schoolId: ctx.profile.schoolId,
        },
        data: {
          deletedAt: new Date(),
        },
      });
      return result;
    }),
  getClassroomOverview: publicProcedure
    .input(getClassroomOverviewSchema)
    .query(async (props) => {
      return getClassroomOverview(props.ctx, props.input);
    }),
  getClassroomsForSession: publicProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      return getClassrooms(ctx, {
        schoolSessionId: input,
      });
    }),
  getCurrentSessionClassroom: publicProcedure.query(async ({ input, ctx }) => {
    return getClassrooms(ctx, {
      schoolSessionId: ctx.profile.sessionId,
    });
  }),
  getForm: publicProcedure
    .input(
      z.object({
        postId: z.number().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const result = await loadQuestions(ctx, input);
      return result?.[0];
    }),
  test: publicProcedure.query(async ({ input, ctx: { db } }) => {
    return {
      id: 1,
    };
  }),
});
