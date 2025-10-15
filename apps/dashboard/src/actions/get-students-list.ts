"use server";

import { PageDataMeta, PageItemData } from "@/types";
import { SearchParamsType } from "@/utils/search-params";
import { studentDisplayName } from "@/utils/utils";
import { whereStudents } from "@/utils/query.students";

import { prisma } from "@school-clerk/db";
import { getStaffListAction } from "./get-staff-list";
import { getAuthCookie } from "./cookies/auth-cookie";

export type StudentData = PageItemData<typeof getStudentsListAction>;
export async function getStudentListPageAction(query: SearchParamsType = {}) {
  const profile = await getAuthCookie();
  query.sessionId = profile.sessionId;
  return await getStaffListAction(query);
}
export async function getStudentsListAction(query: SearchParamsType = {}) {
  const where = whereStudents(query);
  const students = await prisma.students.findMany({
    where,
    select: {
      id: true,
      name: true,

      otherName: true,
      surname: true,
      dob: true,
      gender: true,
      sessionForms: {
        where: {
          schoolSessionId: query.sessionId,
        },
        select: {
          id: true,
          classroomDepartment: {
            select: {
              departmentLevel: true,
              departmentName: true,
              id: true,
              classRoom: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          termForms: {
            where: {
              sessionTermId: query?.termId,
            },
            take: 1,
            select: {
              id: true,
            },
          },
        },
        take: 1,
      },
    },
    orderBy: [
      {
        gender: "asc",
      },
      {
        name: "asc",
      },
    ],
  });
  return {
    meta: {} as PageDataMeta,
    data: students.map((student) => {
      const [{ termForms: [termForm] = [], id, classroomDepartment }] =
        student.sessionForms;
      const classRoom = classroomDepartment?.classRoom;
      const className = classRoom?.name;
      const departmentName = classroomDepartment?.departmentName;
      const departmentId = classroomDepartment?.id;
      return {
        id: student.id,
        gender: student.gender,
        studentName: studentDisplayName(student),
        department: Array.from(new Set([className, departmentName])).join(" "),
        departmentId,
        classId: classRoom?.id,
      };
    }),
  };
}
