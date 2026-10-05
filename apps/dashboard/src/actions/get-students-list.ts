"use server";

import { getDashboardStudentNameFormat } from "@/lib/student-name-format/server";
import { PageDataMeta, PageItemData } from "@/types";
import { whereStudents } from "@/utils/query.students";
import { SearchParamsType } from "@/utils/search-params";
import { studentDisplayName } from "@/utils/utils";

import { prisma } from "@school-clerk/db";
import { DashboardAccessError, requireDashboardModules } from "@/lib/module-access";

export type StudentData = PageItemData<typeof getStudentsListAction>;
export async function getStudentListPageAction(query: SearchParamsType = {}) {
  const { profile } = await requireDashboardModules(["STUDENT_MANAGEMENT", "ACADEMIC_PROGRAMS"], ["Admin", "Registrar"]);
  query.sessionId = profile.sessionId;
	return await getStudentsListAction(query, profile.schoolId);
}
export async function getStudentsListAction(
	query: SearchParamsType = {},
	schoolId?: string,
) {
  const { profile } = await requireDashboardModules(["STUDENT_MANAGEMENT", "ACADEMIC_PROGRAMS"], ["Admin", "Registrar"]);
  if (schoolId && schoolId !== profile.schoolId) throw new DashboardAccessError(403, "The requested school does not match this workspace.");
  const studentNameFormat = await getDashboardStudentNameFormat(profile.schoolId);
  const where = whereStudents(query);
  const students = await prisma.students.findMany({
    where: { AND: [where, { schoolProfileId: profile.schoolId, deletedAt: null }] },
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
          schoolProfileId: profile.schoolId,
          deletedAt: null,
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
              schoolProfileId: profile.schoolId,
              deletedAt: null,
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
        } = {},
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
