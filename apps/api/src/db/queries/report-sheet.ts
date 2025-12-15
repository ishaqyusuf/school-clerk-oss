import type { TRPCContext } from "@api/trpc/init";
import { z } from "zod";

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
  const { db } = ctx;
  const department = await db.classRoomDepartment.findUniqueOrThrow({
    where: {
      id: query.departmentId,
    },
    select: {
      departmentName: true,
      subjects: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          assessments: {
            where: {
              deletedAt: null,
            },
            select: {
              title: true,
              percentageObtainable: true,
              obtainable: true,
              index: true,
              assessmentResults: {
                where: {
                  deletedAt: null,
                },
                select: {
                  obtained: true,
                  percentageScore: true,
                  studentTermFormId: true,
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
          student: {
            deletedAt: null,
          },
        },
        select: {
          id: true,
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
