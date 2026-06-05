import { z } from "@hono/zod-openapi";
import type { Prisma } from "@school-clerk/db";
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
  hasSubClass: z.boolean().optional().nullable(),
  progressionMode: z.string().optional().nullable(),
  departments: z
    .array(
      z.object({
        id: z.string().optional().nullable(),
        name: z.string(),
        departmentLevel: z.number().optional().nullable(),
      })
    )
    .optional(),
  subjects: z.array(z.string()).optional(),
});

function normalizeSubjectTitles(subjects?: string[] | null) {
  const seen = new Set<string>();
  const titles: string[] = [];

  for (const subject of subjects ?? []) {
    const title = subject.trim();
    const key = title.toLowerCase();
    if (!title || seen.has(key)) continue;

    seen.add(key);
    titles.push(title);
  }

  return titles;
}

async function syncClassroomSubjects({
  tx,
  schoolId,
  sessionTermId,
  departmentIds,
  subjectTitles,
}: {
  tx: Prisma.TransactionClient;
  schoolId: string;
  sessionTermId?: string | null;
  departmentIds: string[];
  subjectTitles?: string[] | null;
}) {
  const titles = normalizeSubjectTitles(subjectTitles);
  const termWhere = { sessionTermId: sessionTermId ?? null };

  if (!departmentIds.length) return;

  if (!titles.length) {
    await tx.departmentSubject.updateMany({
      where: {
        classRoomDepartmentId: { in: departmentIds },
        ...termWhere,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });
    return;
  }

  const subjects = await Promise.all(
    titles.map((title) =>
      tx.subject.upsert({
        where: {
          title_schoolProfileId: {
            title,
            schoolProfileId: schoolId,
          },
        },
        create: {
          title,
          schoolProfileId: schoolId,
        },
        update: {
          title,
          schoolProfileId: schoolId,
          deletedAt: null,
        },
        select: { id: true },
      }),
    ),
  );
  const subjectIds = subjects.map((subject) => subject.id);

  for (const departmentId of departmentIds) {
    await tx.departmentSubject.updateMany({
      where: {
        classRoomDepartmentId: departmentId,
        ...termWhere,
        subjectId: { notIn: subjectIds },
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    for (const subjectId of subjectIds) {
      const existing = await tx.departmentSubject.findMany({
        where: {
          classRoomDepartmentId: departmentId,
          ...termWhere,
          subjectId,
        },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });

      if (!existing.length) {
        await tx.departmentSubject.create({
          data: {
            classRoomDepartmentId: departmentId,
            sessionTermId: sessionTermId ?? null,
            subjectId,
          },
        });
        continue;
      }

      const primary = existing[0];
      if (!primary) continue;

      const duplicates = existing.slice(1);
      await tx.departmentSubject.update({
        where: { id: primary.id },
        data: { deletedAt: null },
      });

      if (duplicates.length) {
        await tx.departmentSubject.updateMany({
          where: { id: { in: duplicates.map((duplicate) => duplicate.id) } },
          data: { deletedAt: new Date() },
        });
      }
    }
  }
}

export const classroomRouter = createTRPCRouter({
  createClassroom: publicProcedure
    .input(createClassroomSchema)
    .mutation(async ({ input, ctx }) => {
      const { sessionId, schoolId, termId } = ctx.profile;
      if (!input.departments?.length) {
        input.departments = [{ name: input.className }];
      }
      const departments = input.departments;
      const duplicateNames = new Set<string>();
      for (const department of departments) {
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
            departments
              .map((department) => department.id)
              .filter((id): id is string => !!id),
          );

          for (const department of departments) {
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

          const activeDepartments = await tx.classRoomDepartment.findMany({
            where: {
              classRoomsId: input.classRoomId!,
              deletedAt: null,
            },
            select: { id: true },
          });

          await syncClassroomSubjects({
            tx,
            schoolId,
            sessionTermId: termId,
            departmentIds: activeDepartments.map((department) => department.id),
            subjectTitles: input.subjects,
          });

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

      return ctx.db.$transaction(async (tx) => {
        const classRoom = await tx.classRoom.upsert({
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
                data: departments.map((d) => ({
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
                data: departments.map((d) => ({
                  departmentName: d.name,
                  schoolProfileId: schoolId,
                  departmentLevel: d.departmentLevel,
                })),
              },
            },
          },
          include: {
            classRoomDepartments: {
              where: { deletedAt: null },
              orderBy: [{ departmentLevel: "asc" }, { departmentName: "asc" }],
            },
          },
        });

        await syncClassroomSubjects({
          tx,
          schoolId,
          sessionTermId: termId,
          departmentIds: classRoom.classRoomDepartments.map(
            (department) => department.id,
          ),
          subjectTitles: input.subjects,
        });

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
              subjects: {
                where: {
                  deletedAt: null,
                  sessionTermId: ctx.profile.termId ?? null,
                },
                select: {
                  subject: {
                    select: {
                      title: true,
                    },
                  },
                },
              },
              financeItemApplicabilities: {
                where: { deletedAt: null },
                select: {
                  item: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      amount: true,
                      collectable: true,
                      streamId: true,
                      stream: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
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
        subjects: Array.from(
          new Set(
            classRoom.classRoomDepartments.flatMap((dept) =>
              dept.subjects.map((s) => s.subject.title)
            )
          )
        ).sort(),
        defaultFees: (() => {
          const defaultFeesMap = new Map();
          for (const dept of classRoom.classRoomDepartments) {
            if (!dept.financeItemApplicabilities) continue;
            for (const app of dept.financeItemApplicabilities) {
              const item = app.item;
              if (!defaultFeesMap.has(item.streamId)) {
                defaultFeesMap.set(item.streamId, {
                  streamId: item.streamId,
                  streamName: item.stream?.name || "",
                  required: item.collectable,
                  lines: [],
                });
              }
              const fee = defaultFeesMap.get(item.streamId);
              const desc = item.description || item.name;
              const exists = fee.lines.some(
                (l: any) =>
                  l.description === desc && l.amount === Number(item.amount)
              );
              if (!exists) {
                fee.lines.push({
                  id: item.id,
                  description: desc,
                  amount: Number(item.amount),
                });
              }
            }
          }
          return Array.from(defaultFeesMap.values());
        })(),
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
  getSchoolClassNames: publicProcedure.query(async ({ ctx }) => {
    const classRooms = await ctx.db.classRoom.findMany({
      where: {
        deletedAt: null,
        schoolProfileId: ctx.profile.schoolId,
      },
      distinct: ["name"],
      orderBy: [{ classLevel: "asc" }, { name: "asc" }],
      select: {
        name: true,
        classLevel: true,
      },
    });

    return classRooms;
  }),

  getSchoolStreamStructures: publicProcedure.query(async ({ ctx }) => {
    const classrooms = await ctx.db.classRoom.findMany({
      where: {
        deletedAt: null,
        schoolProfileId: ctx.profile.schoolId,
      },
      select: {
        id: true,
        classRoomDepartments: {
          where: { deletedAt: null },
          select: {
            departmentName: true,
            departmentLevel: true,
          },
          orderBy: [{ departmentLevel: "asc" }, { departmentName: "asc" }],
        },
      },
    });

    const classGroups = new Map<
      string,
      { name: string; departmentLevel: number | null }[]
    >();

    for (const row of classrooms) {
      const streams = row.classRoomDepartments.map((d) => ({
        name: d.departmentName ?? "",
        departmentLevel: d.departmentLevel,
      }));
      if (streams.length > 1) {
        classGroups.set(row.id, streams);
      }
    }

    const uniqueGroups = new Map<
      string,
      { streams: { name: string; departmentLevel: number | null }[] }
    >();

    for (const streams of classGroups.values()) {
      const sortedStreams = streams.sort(
        (a, b) => (a.departmentLevel ?? 9999) - (b.departmentLevel ?? 9999),
      );
      const key = sortedStreams
        .map((s) => `${s.name.trim().toLowerCase()}_${s.departmentLevel}`)
        .join("|");

      if (!uniqueGroups.has(key)) {
        uniqueGroups.set(key, { streams: sortedStreams });
      }
    }

    return Array.from(uniqueGroups.values());
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
