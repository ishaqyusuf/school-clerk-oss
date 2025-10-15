"use server";

import { unstable_cache } from "next/cache";
import { whereClassroom } from "@/utils/where.classroom";

import { prisma } from "@school-clerk/db";

import { getAuthCookie } from "../cookies/auth-cookie";
import { getStudentsListAction } from "../get-students-list";
import { SearchParamsType } from "@/utils/search-params";

export async function getCachedClassRooms(termId, sessionId) {
  return unstable_cache(
    async () => {
      const where = whereClassroom({
        sessionId: sessionId,
      });
      const classrooms = await prisma.classRoom.findMany({
        where,
        include: {
          classRoomDepartments: {
            include: {},
          },
        },
      });
      return classrooms
        .map((c) => {
          return c.classRoomDepartments.map((d) => {
            return {
              departmentId: d.id,
              classId: c.id,
              name: Array.from(new Set([c.name, d.departmentName]))
                .filter(Boolean)
                .join(" "),
            };
          });
        })
        .flat();
    },
    [`classrooms_${termId}`],
    {
      tags: [`classrooms_${termId}`],
    }
  )();
}
export async function getCachedClassroomStudents(departmentId, start = 0) {
  const tags = [`classroom_students_${departmentId}`];
  const profile = await getAuthCookie();
  const query: SearchParamsType = {};
  query.sessionId = profile.sessionId;
  query.start = start;
  query.departmentId = departmentId;
  return unstable_cache(
    async (query) => {
      return await getStudentsListAction(query);
    },
    tags,
    { tags }
  )(query);
}
