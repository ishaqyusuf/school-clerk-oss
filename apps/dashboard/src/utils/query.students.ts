import { prisma, Prisma } from "@school-clerk/db";

import { SearchParamsKeys, SearchParamsType } from "./search-params";
import { composeQuery } from "./utils";
import { composeQueryData } from "./query-response";

export async function commissionQueryMetaData(query: SearchParamsType) {
  const model = prisma.students;
  const qd = await composeQueryData(query, whereStudents(query), model);
  return {
    ...qd,
    model,
  };
}
export function whereStudents(query: SearchParamsType) {
  const where: Prisma.StudentsWhereInput[] = [
    {
      sessionForms: {
        some: {
          deletedAt: null,
          schoolSessionId: query.sessionId,
        },
      },
    },
  ];
  if (query.departmentId) {
    where.push({
      sessionForms: {
        some: {
          schoolSessionId: query.sessionId,
          classroomDepartmentId:
            query.departmentId == "undocumented" || !query?.departmentId
              ? null
              : query.departmentId,
        },
      },
    });
  }
  Object.entries(query).map(([key, value]) => {
    if (!value) return;
    switch (key as SearchParamsKeys) {
      case "studentId":
        where.push({
          id: value,
        });
        break;
    }
  });

  return composeQuery(where);
}
