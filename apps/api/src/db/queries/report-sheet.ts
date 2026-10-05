import type { TRPCContext } from "@api/trpc/init";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  assertTeacherCanAccessClassroomDepartment,
  getTeacherAcademicAccess,
} from "../../lib/teacher-authorization";

export const getClassroomReportSheetSchema = z.object({
  departmentId: z.string(),
  sessionTermId: z.string(),
});
export type GetClassroomReportSheetSchema = z.infer<
  typeof getClassroomReportSheetSchema
>;

export async function getClassroomReportSheet(
  ctx: TRPCContext,
  query: GetClassroomReportSheetSchema
) {
  const schoolId = ctx.profile.schoolId;
  if (!schoolId) throw new TRPCError({ code: "UNAUTHORIZED", message: "School context is required." });
  const term = await ctx.db.sessionTerm.findFirst({
    where: { id: query.sessionTermId, schoolId, deletedAt: null },
    select: { id: true },
  });
  if (!term) throw new TRPCError({ code: "NOT_FOUND", message: "Report term not found." });
  await assertTeacherCanAccessClassroomDepartment(
    ctx,
    query.departmentId,
    query.sessionTermId,
  );
  const teacherAccess = await getTeacherAcademicAccess(
    ctx,
    query.sessionTermId,
  );

  const { db } = ctx;
  const department = await db.classRoomDepartment.findFirst({
    where: {
      id: query.departmentId,
      schoolProfileId: schoolId,
      deletedAt: null,
    },
    select: {
      departmentName: true,
      subjects: {
        where: {
          deletedAt: null,
          classRoomDepartmentId: query.departmentId,
          sessionTermId: query.sessionTermId,
          ...(teacherAccess
            ? {
                id: {
                  in: teacherAccess.departmentSubjectIds,
                },
              }
            : {}),
        },
        select: {
          id: true,
          assessments: {
            where: {
              deletedAt: null,
              isGroup: false,
            },
            orderBy: [
              {
                index: "asc",
              },
              {
                id: "asc",
              },
            ],
            select: {
              id: true,
              title: true,
              parentAssessment: {
                select: {
                  id: true,
                  title: true,
                  index: true,
                  printMode: true,
                },
              },
              percentageObtainable: true,
              obtainable: true,
              index: true,
              assessmentResults: {
                where: {
                  deletedAt: null,
                  studentTermForm: {
                    sessionTermId: query.sessionTermId,
                  },
                },
                select: {
                  id: true,
                  obtained: true,
                  percentageScore: true,
                  studentTermFormId: true,
                  studentId: true,
                },
              },
            },
          },
          subject: {
            select: {
              title: true,
            },
          },
        },
      },
      studentTermForms: {
        orderBy: [
          {
            student: {
              gender: "asc",
            },
          },
          {
            student: {
              name: "asc",
            },
          },
        ],
        where: {
          sessionTermId: query.sessionTermId,
          deletedAt: null,
          registrationReviewStatus: { not: "REJECTED" },
          student: {
            deletedAt: null,
            schoolProfileId: schoolId,
          },
          schoolProfileId: schoolId,
        },
        select: {
          id: true,
          registrationReviewStatus: true,
          classroomDepartmentId: true,
          student: {
            select: {
              id: true,
              gender: true,
              name: true,
              otherName: true,
              surname: true,
            },
          },
        },
      },
    },
  });

  if (!department) throw new TRPCError({ code: "NOT_FOUND", message: "Report classroom not found." });

  // const duplicateTermSheets =
  department.studentTermForms.map((stf) => {
    const dups = department.studentTermForms.filter(
      (s) => s.student?.id === stf?.student?.id
    );

    if (dups.length > 1) {
      // duplicates found
    }
  });
  return department;
}
