import { z } from "@hono/zod-openapi";
import { createTRPCRouter, publicProcedure } from "../init";
import { tryGetCurrentUserContext } from "@api/lib/notifications";

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
          staffProfile: {
            select: {
              id: true,
              name: true,
            },
          },
          studentAttendanceList: {
            where: {
              deletedAt: null,
            },
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
        staffName: r.staffProfile?.name ?? null,
        total: r.studentAttendanceList.length,
        present: r.studentAttendanceList.filter((s) => s.isPresent).length,
        absent: r.studentAttendanceList.filter((s) => !s.isPresent).length,
      }));
    }),

  getAttendanceSession: publicProcedure
    .input(z.object({ attendanceId: z.string() }))
    .query(async ({ input, ctx }) => {
      const record = await ctx.db.classRoomAttendance.findFirst({
        where: {
          id: input.attendanceId,
          schoolProfileId: ctx.profile.schoolId,
          deletedAt: null,
        },
        select: {
          id: true,
          attendanceTitle: true,
          createdAt: true,
          staffProfile: {
            select: {
              id: true,
              name: true,
            },
          },
          studentAttendanceList: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
              isPresent: true,
              comment: true,
              StudentTermForm: {
                select: {
                  id: true,
                  student: {
                    select: {
                      id: true,
                      name: true,
                      surname: true,
                      otherName: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!record) return null;

      const students = record.studentAttendanceList
        .map((item) => {
          const student = item.StudentTermForm?.student;
          const studentName = [
            student?.name,
            student?.surname,
            student?.otherName,
          ]
            .filter(Boolean)
            .join(" ");

          return {
            id: item.id,
            studentId: student?.id ?? null,
            studentTermFormId: item.StudentTermForm?.id ?? null,
            studentName: studentName || "Unknown student",
            isPresent: Boolean(item.isPresent),
            comment: item.comment ?? null,
          };
        })
        .sort((a, b) => a.studentName.localeCompare(b.studentName));

      const present = students.filter((student) => student.isPresent).length;
      const absent = students.length - present;

      return {
        id: record.id,
        attendanceTitle: record.attendanceTitle,
        createdAt: record.createdAt,
        staffName: record.staffProfile?.name ?? null,
        total: students.length,
        present,
        absent,
        students,
      };
    }),

  takeAttendance: publicProcedure
    .input(takeAttendanceSchema)
    .mutation(async ({ input, ctx }) => {
      const currentUser = await tryGetCurrentUserContext(ctx);
      const staffProfile = currentUser?.user?.email
        ? await ctx.db.staffProfile.findFirst({
            where: {
              schoolProfileId: ctx.profile.schoolId,
              email: currentUser.user.email,
              deletedAt: null,
            },
            select: {
              id: true,
            },
          })
        : null;

      return ctx.db.classRoomAttendance.create({
        data: {
          attendanceTitle: input.attendanceTitle,
          schoolProfileId: ctx.profile.schoolId,
          departmentId: input.departmentId,
          staffProfileId: staffProfile?.id,
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

  deleteAttendanceSession: publicProcedure
    .input(z.object({ attendanceId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.db.classRoomAttendance.findFirst({
        where: {
          id: input.attendanceId,
          schoolProfileId: ctx.profile.schoolId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!existing) return { success: true };

      const deletedAt = new Date();

      await ctx.db.$transaction([
        ctx.db.studentAttendance.updateMany({
          where: {
            classroomAttendanceId: input.attendanceId,
            deletedAt: null,
          },
          data: {
            deletedAt,
          },
        }),
        ctx.db.classRoomAttendance.update({
          where: {
            id: input.attendanceId,
          },
          data: {
            deletedAt,
          },
        }),
      ]);

      return { success: true };
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
          classroomAttendance: {
            is: {
              deletedAt: null,
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
