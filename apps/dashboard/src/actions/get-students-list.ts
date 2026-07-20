"use server";

import { getDashboardStudentNameFormat } from "@/lib/student-name-format/server";
import { PageDataMeta, PageItemData } from "@/types";
import { whereStudents } from "@/utils/query.students";
import { SearchParamsType } from "@/utils/search-params";
import { studentDisplayName } from "@/utils/utils";
import { DEFAULT_STUDENT_NAME_FORMAT } from "@school-clerk/utils/student-name";

import { prisma } from "@school-clerk/db";
import { getAuthCookie } from "./cookies/auth-cookie";

export type StudentData = PageItemData<typeof getStudentsListAction>;
export async function getStudentListPageAction(query: SearchParamsType = {}) {
  const profile = await getAuthCookie();
  query.sessionId = profile.sessionId;
	return await getStudentsListAction(query, profile.schoolId);
}
export async function getStudentsListAction(
	query: SearchParamsType = {},
	schoolId?: string,
) {
	const resolvedSchoolId = schoolId ?? (await getAuthCookie()).schoolId;
	const studentNameFormat = resolvedSchoolId
		? await getDashboardStudentNameFormat(resolvedSchoolId)
		: DEFAULT_STUDENT_NAME_FORMAT;
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
			const [
				{
					termForms: [termForm] = [],
					id,
					classroomDepartment,
				},
			] = student.sessionForms;
      const classRoom = classroomDepartment?.classRoom;
      const className = classRoom?.name;
      const departmentName = classroomDepartment?.departmentName;
      const departmentId = classroomDepartment?.id;
      return {
        id: student.id,
        gender: student.gender,
				studentName: studentDisplayName(student, studentNameFormat),
        department: Array.from(new Set([className, departmentName])).join(" "),
        departmentId,
        classId: classRoom?.id,
      };
    }),
  };
}
