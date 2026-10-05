"use server";

import { AsyncFnType, PageItemData } from "@/types";
import { SearchParamsType } from "@/utils/search-params";

import { classroomDepartmentListOrderBy, prisma } from "@school-clerk/db";
import { classroomDisplayName } from "@school-clerk/utils";

import { requireDashboardModules } from "@/lib/module-access";
import { z } from "zod";
import { revalidatePath } from "next/cache";

export type ClassRoomPageItem = PageItemData<typeof getClassRooms>;
export async function getClassRooms(params: SearchParamsType) {
  const { profile } = await requireDashboardModules(["ACADEMIC_PROGRAMS", "STUDENT_MANAGEMENT"], ["Admin", "Registrar"]);

  const classRooms = await prisma.classRoomDepartment.findMany({
    where: {
      id: !params?.departmentId ? undefined : params.departmentId,
      schoolProfileId: profile.schoolId,
      deletedAt: null,
      classRoom: {
        schoolSessionId: profile?.sessionId,
        name: params.className ? params.className : undefined,
        session: {
          id: profile.sessionId,
        },
      },
    },
    select: {
      id: true,
      departmentName: true,
      departmentLevel: true,
      _count: {
        select: {
          studentSessionForms: {
            where: {
              student: {
                deletedAt: null,
              },
            },
          },
        },
      },
      classRoom: {
        select: {
          session: {
            select: {
              title: true,
              id: true,
            },
          },
          name: true,
          id: true,
        },
      },
    },
    orderBy: classroomDepartmentListOrderBy,
  });
  return {
    data: classRooms.map(({ ...a }) => {
      const displayName = classroomDisplayName({
        className: a.classRoom?.name,
        departmentName: a.departmentName,
      });
      return {
        ...a,
        displayName,
      };
    }),
    meta: {} as any,
  };
}

export async function updateClassroomDepartmentGrade(id: string, departmentLevel: number) {
  const { profile } = await requireDashboardModules(["ACADEMIC_PROGRAMS"], ["Admin", "Registrar"]);
  const input = z.object({ id: z.string().min(1), departmentLevel: z.number().finite() }).parse({ id, departmentLevel });
  await prisma.classRoomDepartment.update({
    where: {
      id: input.id,
      schoolProfileId: profile.schoolId,
      deletedAt: null,
    },
    data: {
      departmentLevel: input.departmentLevel,
    },
  });
  revalidatePath("/academic/classes");
}
