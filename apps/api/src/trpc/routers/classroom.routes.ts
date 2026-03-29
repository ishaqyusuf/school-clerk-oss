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

  /** Copy all classrooms from a previous session into the current session. */
  importFromPreviousSession: publicProcedure
    .input(z.object({ fromSessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { db, profile } = ctx;
      const { sessionId, schoolId } = profile;

      // Fetch all non-deleted classrooms+departments from the source session
      const sourceClassrooms = await db.classRoom.findMany({
        where: { schoolSessionId: input.fromSessionId, deletedAt: null },
        include: {
          classRoomDepartments: {
            where: { deletedAt: null },
            orderBy: [{ departmentLevel: "asc" }, { departmentName: "asc" }],
          },
        },
        orderBy: [{ classLevel: "asc" }, { name: "asc" }],
      });

      let created = 0;
      let skipped = 0;

      for (const cls of sourceClassrooms) {
        const result = await db.classRoom.upsert({
          where: {
            schoolSessionId_name: {
              name: cls.name!,
              schoolSessionId: sessionId!,
            },
          },
          update: {
            classLevel: cls.classLevel,
            classRoomDepartments: {
              createMany: {
                data: cls.classRoomDepartments.map((d) => ({
                  departmentName: d.departmentName,
                  schoolProfileId: schoolId,
                  departmentLevel: d.departmentLevel,
                })),
                skipDuplicates: true,
              },
            },
          },
          create: {
            name: cls.name!,
            classLevel: cls.classLevel,
            schoolSessionId: sessionId!,
            schoolProfileId: schoolId!,
            classRoomDepartments: {
              createMany: {
                data: cls.classRoomDepartments.map((d) => ({
                  departmentName: d.departmentName,
                  schoolProfileId: schoolId,
                  departmentLevel: d.departmentLevel,
                })),
              },
            },
          },
          select: { id: true },
        });
        created++;
      }

      return { created, skipped };
    }),

  /** Register a single classroom (by name) from an old session into the current session. */
  registerClassroomForSession: publicProcedure
    .input(
      z.object({
        className: z.string(),
        departmentName: z.string(),
        classLevel: z.number().optional().nullable(),
        departmentLevel: z.number().optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { db, profile } = ctx;
      const { sessionId, schoolId } = profile;
      return db.classRoom.upsert({
        where: {
          schoolSessionId_name: {
            name: input.className,
            schoolSessionId: sessionId!,
          },
        },
        update: {
          classLevel: input.classLevel,
          classRoomDepartments: {
            createMany: {
              data: [
                {
                  departmentName: input.departmentName,
                  schoolProfileId: schoolId,
                  departmentLevel: input.departmentLevel,
                },
              ],
              skipDuplicates: true,
            },
          },
        },
        create: {
          name: input.className,
          classLevel: input.classLevel,
          schoolSessionId: sessionId!,
          schoolProfileId: schoolId!,
          classRoomDepartments: {
            createMany: {
              data: [
                {
                  departmentName: input.departmentName,
                  schoolProfileId: schoolId,
                  departmentLevel: input.departmentLevel,
                },
              ],
            },
          },
        },
        include: { classRoomDepartments: true },
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
