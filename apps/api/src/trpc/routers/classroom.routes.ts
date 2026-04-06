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
  classRoomId: z.string().optional().nullable(),
  className: z.string().min(1),
  classLevel: z.number().optional().nullable(),
  departments: z
    .array(
      z.object({
        id: z.string().optional().nullable(),
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
      const duplicateNames = new Set<string>();
      for (const department of input.departments) {
        const key = department.name.trim().toLowerCase();
        if (duplicateNames.has(key)) {
          throw new Error("Duplicate stream names are not allowed in one class.");
        }
        duplicateNames.add(key);
      }

      if (input.classRoomId) {
        return ctx.db.$transaction(async (tx) => {
          const classRoom = await tx.classRoom.update({
            where: { id: input.classRoomId! },
            data: {
              name: input.className,
              classLevel: input.classLevel,
            },
            select: { id: true },
          });

          const existingDepartments = await tx.classRoomDepartment.findMany({
            where: {
              classRoomsId: input.classRoomId!,
              deletedAt: null,
            },
            select: {
              id: true,
              departmentName: true,
            },
          });

          const submittedIds = new Set(
            input.departments
              .map((department) => department.id)
              .filter((id): id is string => !!id),
          );

          for (const department of input.departments) {
            if (department.id) {
              await tx.classRoomDepartment.update({
                where: { id: department.id },
                data: {
                  departmentName: department.name,
                  departmentLevel: department.departmentLevel,
                  classRoomsId: input.classRoomId!,
                },
              });
              continue;
            }

            await tx.classRoomDepartment.create({
              data: {
                classRoomsId: input.classRoomId!,
                departmentName: department.name,
                departmentLevel: department.departmentLevel,
                schoolProfileId: schoolId,
              },
            });
          }

          for (const department of existingDepartments) {
            if (!submittedIds.has(department.id)) {
              await tx.classRoomDepartment.update({
                where: { id: department.id },
                data: { deletedAt: new Date() },
              });
            }
          }

          return tx.classRoom.findUniqueOrThrow({
            where: { id: classRoom.id },
            include: {
              classRoomDepartments: {
                where: { deletedAt: null },
                orderBy: [{ departmentLevel: "asc" }, { departmentName: "asc" }],
              },
            },
          });
        });
      }

      return ctx.db.classRoom.upsert({
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
          classLevel: input.classLevel,
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
  getClassroomStructure: publicProcedure
    .input(z.object({ classRoomId: z.string() }))
    .query(async ({ input, ctx }) => {
      const classRoom = await ctx.db.classRoom.findUniqueOrThrow({
        where: { id: input.classRoomId },
        select: {
          id: true,
          name: true,
          classLevel: true,
          classRoomDepartments: {
            where: { deletedAt: null },
            orderBy: [{ departmentLevel: "asc" }, { departmentName: "asc" }],
            select: {
              id: true,
              departmentName: true,
              departmentLevel: true,
            },
          },
        },
      });

      const uniqueLevels = new Set(
        classRoom.classRoomDepartments
          .map((department) => department.departmentLevel)
          .filter((level) => level !== null && level !== undefined),
      );

      return {
        id: classRoom.id,
        className: classRoom.name ?? "",
        classLevel: classRoom.classLevel ?? null,
        hasSubClass: classRoom.classRoomDepartments.length > 1,
        progressionMode: uniqueLevels.size > 1 ? "department" : "classroom",
        departments: classRoom.classRoomDepartments.map((department) => ({
          id: department.id,
          name: department.departmentName ?? "",
          departmentLevel: department.departmentLevel ?? null,
        })),
      };
    }),
  updateClassroomLevel: publicProcedure
    .input(
      z.object({
        classRoomId: z.string(),
        classLevel: z.number().optional().nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.classRoom.update({
        where: { id: input.classRoomId },
        data: {
          classLevel: input.classLevel,
        },
        select: {
          id: true,
          classLevel: true,
        },
      });
    }),
  moveClassroomStreams: publicProcedure
    .input(
      z.object({
        sourceClassRoomId: z.string(),
        targetClassRoomId: z.string(),
        walkBackHigherGrades: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.sourceClassRoomId === input.targetClassRoomId) {
        throw new Error("Source and target class must be different.");
      }

      return ctx.db.$transaction(async (tx) => {
        const [sourceClass, targetClass] = await Promise.all([
          tx.classRoom.findUniqueOrThrow({
            where: {
              id: input.sourceClassRoomId,
              schoolProfileId: ctx.profile.schoolId,
              deletedAt: null,
            },
            include: {
              classRoomDepartments: {
                where: { deletedAt: null },
                orderBy: [{ departmentLevel: "asc" }, { departmentName: "asc" }],
              },
            },
          }),
          tx.classRoom.findUniqueOrThrow({
            where: {
              id: input.targetClassRoomId,
              schoolProfileId: ctx.profile.schoolId,
              deletedAt: null,
            },
            include: {
              classRoomDepartments: {
                where: { deletedAt: null },
                orderBy: [{ departmentLevel: "asc" }, { departmentName: "asc" }],
              },
            },
          }),
        ]);

        const targetNames = new Set(
          targetClass.classRoomDepartments
            .map((department) => department.departmentName?.trim().toLowerCase())
            .filter((name): name is string => !!name),
        );

        const conflicting = sourceClass.classRoomDepartments.find((department) =>
          targetNames.has(department.departmentName?.trim().toLowerCase() ?? ""),
        );

        if (conflicting) {
          throw new Error(
            `Target class already has a stream named "${conflicting.departmentName}".`,
          );
        }

        if (!sourceClass.classRoomDepartments.length) {
          throw new Error("Source class has no active streams to move.");
        }

        for (const department of sourceClass.classRoomDepartments) {
          await tx.classRoomDepartment.update({
            where: { id: department.id },
            data: {
              classRoomsId: targetClass.id,
            },
          });
        }

        if (
          input.walkBackHigherGrades &&
          sourceClass.schoolSessionId &&
          sourceClass.classLevel != null
        ) {
          await tx.classRoom.updateMany({
            where: {
              deletedAt: null,
              schoolProfileId: ctx.profile.schoolId,
              schoolSessionId: sourceClass.schoolSessionId,
              classLevel: {
                gt: sourceClass.classLevel,
              },
            },
            data: {
              classLevel: {
                decrement: 1,
              },
            },
          });
        }

        await tx.classRoom.update({
          where: { id: sourceClass.id },
          data: {
            deletedAt: new Date(),
          },
        });

        return {
          moved: sourceClass.classRoomDepartments.length,
          sourceClassName: sourceClass.name,
          targetClassName: targetClass.name,
          walkedBackHigherGrades:
            Boolean(input.walkBackHigherGrades) &&
            sourceClass.classLevel != null,
        };
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
      if (!input.schoolSessionId && !input.sessionTermId) {
        input.schoolSessionId = ctx.profile.sessionId;
      }
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
