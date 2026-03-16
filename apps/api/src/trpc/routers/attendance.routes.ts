import { z } from "@hono/zod-openapi";
import { createTRPCRouter, publicProcedure } from "../init";

const takeAttendanceSchema = z.object({
  departmentId: z.string(),
  attendanceTitle: z.string(),
  students: z.array(
    z.object({
      studentTermFormId: z.string(),
      isPresent: z.boolean().default(false),
      comment: z.string().optional().nullable(),
    })
  ),
});

export const attendanceRouter = createTRPCRouter({
  getClassroomAttendance: publicProcedure
    .input(z.object({ departmentId: z.string() }))
    .query(async ({ input, ctx }) => {
      const records = await ctx.db.classRoomAttendance.findMany({
        where: {
          departmentId: input.departmentId,
          schoolProfileId: ctx.profile.schoolId,
          deletedAt: null,
        },
        select: {
          id: true,
          attendanceTitle: true,
          createdAt: true,
          _count: {
            select: {
              studentAttendanceList: true,
            },
          },
          studentAttendanceList: {
            select: {
              isPresent: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return records.map((r) => ({
        id: r.id,
        attendanceTitle: r.attendanceTitle,
        createdAt: r.createdAt,
        total: r._count.studentAttendanceList,
        present: r.studentAttendanceList.filter((s) => s.isPresent).length,
        absent: r.studentAttendanceList.filter((s) => !s.isPresent).length,
      }));
    }),

  takeAttendance: publicProcedure
    .input(takeAttendanceSchema)
    .mutation(async ({ input, ctx }) => {
      return ctx.db.classRoomAttendance.create({
        data: {
          attendanceTitle: input.attendanceTitle,
          schoolProfileId: ctx.profile.schoolId,
          departmentId: input.departmentId,
          studentAttendanceList: {
            create: input.students.map((s) => ({
              isPresent: s.isPresent,
              comment: s.comment,
              studentTermFormId: s.studentTermFormId,
              departmentId: input.departmentId,
              schoolProfileId: ctx.profile.schoolId,
            })),
          },
        },
        select: { id: true },
      });
    }),

  getStudentAttendanceHistory: publicProcedure
    .input(z.object({ studentId: z.string().optional().nullable() }))
    .query(async ({ input, ctx }) => {
      if (!input.studentId) return [];
      const records = await ctx.db.studentAttendance.findMany({
        where: {
          schoolProfileId: ctx.profile.schoolId,
          StudentTermForm: {
            student: {
              id: input.studentId,
            },
          },
          deletedAt: null,
        },
        select: {
          id: true,
          isPresent: true,
          comment: true,
          createdAt: true,
          classroomAttendance: {
            select: {
              attendanceTitle: true,
              createdAt: true,
            },
          },
          department: {
            select: {
              departmentName: true,
              classRoom: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return records;
    }),
});
