"use server";

import { unstable_cache } from "next/cache";
import { whereClassroom } from "@/utils/where.classroom";

import {
  classroomListOrderBy,
  nestedClassroomDepartmentListOrderBy,
  prisma,
} from "@school-clerk/db";
import { classroomDisplayName } from "@school-clerk/utils";

import { requireDashboardModules } from "@/lib/module-access";
import { getStudentsListAction } from "../get-students-list";
import { SearchParamsType } from "@/utils/search-params";

export async function getCachedClassRooms(termId: string, sessionId: string) {
  const { profile } = await requireDashboardModules(["ACADEMIC_PROGRAMS"], ["Admin", "Registrar"]);
  return unstable_cache(
    async () => {
      const where = whereClassroom({
        sessionId: sessionId,
      });
      const classrooms = await prisma.classRoom.findMany({
        where: { AND: [where, { schoolProfileId: profile.schoolId, deletedAt: null }] },
        include: {
          classRoomDepartments: {
            where: { schoolProfileId: profile.schoolId, deletedAt: null },
            include: {},
            orderBy: nestedClassroomDepartmentListOrderBy,
          },
        },
        orderBy: classroomListOrderBy,
      });
      return classrooms
        .map((c) => {
          return c.classRoomDepartments.map((d) => {
            return {
              departmentId: d.id,
              classId: c.id,
              name: classroomDisplayName({
                className: c.name,
                departmentName: d.departmentName,
              }),
            };
          });
        })
        .flat();
    },
    ["classrooms", profile.schoolId, sessionId, termId],
    {
      tags: [`classrooms_${termId}`],
    }
  )();
}
export async function getCachedClassroomStudents(departmentId: string, start = 0) {
  const { profile } = await requireDashboardModules(["STUDENT_MANAGEMENT", "ACADEMIC_PROGRAMS"], ["Admin", "Registrar"]);
  const query: SearchParamsType = {};
  query.sessionId = profile.sessionId;
  query.start = start;
  query.departmentId = departmentId;
  // The action resolves live authorization; do not execute it inside a shared
  // cache callback or bypass that authorization on a cache hit.
  return getStudentsListAction(query, profile.schoolId);
}
