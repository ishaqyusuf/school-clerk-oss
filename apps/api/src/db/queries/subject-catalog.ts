import type { Prisma } from "@school-clerk/db";

type SubjectCatalogQuery = {
  q?: string | null;
};

type SubjectCatalogScope = {
  accessibleDepartmentSubjectIds?: string[];
  schoolProfileId: string;
  sessionTermId: string;
};

export function buildSubjectCatalogAssignmentWhere(
  scope: SubjectCatalogScope,
): Prisma.DepartmentSubjectWhereInput {
  return {
    deletedAt: null,
    sessionTermId: scope.sessionTermId,
    ...(scope.accessibleDepartmentSubjectIds
      ? {
          id: {
            in: scope.accessibleDepartmentSubjectIds,
          },
        }
      : {}),
    classRoomDepartment: {
      deletedAt: null,
      schoolProfileId: scope.schoolProfileId,
    },
  };
}

export function buildSubjectCatalogWhere(
  query: SubjectCatalogQuery,
  scope: SubjectCatalogScope,
): Prisma.SubjectWhereInput {
  const assignmentWhere = buildSubjectCatalogAssignmentWhere(scope);
  const search = query.q?.trim();
  const restrictToAssignments =
    scope.accessibleDepartmentSubjectIds !== undefined;

  return {
    deletedAt: null,
    schoolProfileId: scope.schoolProfileId,
    ...(search
      ? {
          title: {
            contains: search,
            mode: "insensitive",
          },
        }
      : {}),
    ...(restrictToAssignments
      ? {
          departmentSubjects: {
            some: assignmentWhere,
          },
        }
      : {}),
  };
}

export function countSubjectClassrooms(
  assignments: Array<{
    classRoomDepartment: { classRoomsId: string | null } | null;
  }>,
) {
  return new Set(
    assignments
      .map((assignment) => assignment.classRoomDepartment?.classRoomsId)
      .filter((id): id is string => Boolean(id)),
  ).size;
}
