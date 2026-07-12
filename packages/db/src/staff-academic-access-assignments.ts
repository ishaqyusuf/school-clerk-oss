import type {
  Prisma,
  StaffAcademicAccessScope,
  StaffClassroomSubjectAccessMode,
} from "./generated/client";

export type StaffAcademicAssignmentInput = {
  scope?: StaffAcademicAccessScope | null;
  classRoomId?: string | null;
  classRoomDepartmentId?: string | null;
  subjectId?: string | null;
  departmentSubjectId?: string | null;
  subjectAccessMode?: StaffClassroomSubjectAccessMode | null;
  departmentSubjectIds?: Array<string | null | undefined> | null;
};

export type NormalizedStaffAcademicAssignment = {
  scope: StaffAcademicAccessScope;
  classRoomId?: string;
  classRoomDepartmentId?: string;
  subjectId?: string;
  departmentSubjectId?: string;
  subjectAccessMode: StaffClassroomSubjectAccessMode;
  departmentSubjectIds: string[];
};

export type StaffAcademicFormAssignment = {
  scope: StaffAcademicAccessScope;
  classRoomId?: string | null;
  classRoomDepartmentId?: string | null;
  subjectId?: string | null;
  departmentSubjectId?: string | null;
  subjectAccessMode: StaffClassroomSubjectAccessMode;
  departmentSubjectIds: string[];
};

export type StaffAcademicGrantForForm = {
  scope: StaffAcademicAccessScope;
  classRoomId?: string | null;
  classRoomDepartmentId?: string | null;
  subjectId?: string | null;
  departmentSubjectId?: string | null;
  departmentSubject?: {
    classRoomDepartmentId?: string | null;
  } | null;
};

type IdRecord = string | { id?: string | null };

function toIdSet(records: IdRecord[]) {
  return new Set(
    records
      .map((record) => (typeof record === "string" ? record : record.id))
      .filter((id): id is string => Boolean(id)),
  );
}

function cleanId(value?: string | null) {
  const id = value?.trim();
  return id || undefined;
}

export function normalizeStaffAcademicAssignments(
  assignments: StaffAcademicAssignmentInput[],
): NormalizedStaffAcademicAssignment[] {
  const map = new Map<
    string,
    Omit<NormalizedStaffAcademicAssignment, "departmentSubjectIds"> & {
      subjectIds: Set<string>;
    }
  >();

  for (const assignment of assignments) {
    const scope = assignment.scope ?? "DEPARTMENT";
    const classRoomId = cleanId(assignment.classRoomId);
    const classRoomDepartmentId = cleanId(assignment.classRoomDepartmentId);
    const subjectId = cleanId(assignment.subjectId);
    const departmentSubjectId = cleanId(assignment.departmentSubjectId);

    const key = [
      scope,
      classRoomId ?? "",
      classRoomDepartmentId ?? "",
      subjectId ?? "",
      departmentSubjectId ?? "",
    ].join("|");
    if (!key.replace(/\|/g, "")) continue;

    const subjectAccessMode = assignment.subjectAccessMode ?? "SELECTED";
    const current = map.get(key) ?? {
      scope,
      classRoomId,
      classRoomDepartmentId,
      subjectId,
      departmentSubjectId,
      subjectAccessMode,
      subjectIds: new Set<string>(),
    };

    current.subjectAccessMode =
      current.subjectAccessMode === "ALL" || subjectAccessMode === "ALL"
        ? "ALL"
        : "SELECTED";

    for (const id of assignment.departmentSubjectIds ?? []) {
      const normalizedId = cleanId(id);
      if (normalizedId) {
        current.subjectIds.add(normalizedId);
      }
    }
    if (departmentSubjectId) {
      current.subjectIds.add(departmentSubjectId);
    }

    map.set(key, current);
  }

  return Array.from(map.values()).map((assignment) => ({
    scope: assignment.scope,
    classRoomId: assignment.classRoomId,
    classRoomDepartmentId: assignment.classRoomDepartmentId,
    subjectId: assignment.subjectId,
    departmentSubjectId: assignment.departmentSubjectId,
    subjectAccessMode: assignment.subjectAccessMode,
    departmentSubjectIds:
      assignment.subjectAccessMode === "ALL"
        ? []
        : Array.from(assignment.subjectIds),
  }));
}

export function collectStaffAcademicAssignmentReferenceIds(
  assignments: NormalizedStaffAcademicAssignment[],
) {
  return {
    classRoomIds: Array.from(
      new Set(assignments.flatMap((assignment) => assignment.classRoomId ?? [])),
    ),
    classRoomDepartmentIds: Array.from(
      new Set(
        assignments.flatMap(
          (assignment) => assignment.classRoomDepartmentId ?? [],
        ),
      ),
    ),
    subjectIds: Array.from(
      new Set(assignments.flatMap((assignment) => assignment.subjectId ?? [])),
    ),
    departmentSubjectIds: Array.from(
      new Set(
        assignments.flatMap((assignment) => [
          ...(assignment.departmentSubjectId
            ? [assignment.departmentSubjectId]
            : []),
          ...assignment.departmentSubjectIds,
        ]),
      ),
    ),
  };
}

export function buildStaffAcademicAccessPersistence({
  assignments,
  staffTermProfileId,
}: {
  assignments: NormalizedStaffAcademicAssignment[];
  staffTermProfileId: string;
}) {
  const legacyClassroomAssignments = assignments
    .filter(
      (assignment) =>
        assignment.scope === "DEPARTMENT" && assignment.classRoomDepartmentId,
    )
    .map((assignment) => ({
      staffTermProfileId,
      classRoomDepartmentId: assignment.classRoomDepartmentId,
      subjectAccessMode: assignment.subjectAccessMode,
    }));

  const academicAccessGrants: Prisma.StaffAcademicAccessGrantCreateManyInput[] =
    [];

  for (const assignment of assignments) {
    if (assignment.scope === "CLASS" && assignment.classRoomId) {
      academicAccessGrants.push({
        scope: "CLASS",
        staffTermProfileId,
        classRoomId: assignment.classRoomId,
      });
      continue;
    }

    if (
      assignment.scope === "CLASS_SUBJECT" &&
      assignment.classRoomId &&
      assignment.subjectId
    ) {
      academicAccessGrants.push({
        scope: "CLASS_SUBJECT",
        staffTermProfileId,
        classRoomId: assignment.classRoomId,
        subjectId: assignment.subjectId,
      });
      continue;
    }

    if (assignment.scope === "DEPARTMENT" && assignment.classRoomDepartmentId) {
      if (assignment.subjectAccessMode === "ALL") {
        academicAccessGrants.push({
          scope: "DEPARTMENT",
          staffTermProfileId,
          classRoomDepartmentId: assignment.classRoomDepartmentId,
        });
        continue;
      }

      for (const departmentSubjectId of assignment.departmentSubjectIds) {
        academicAccessGrants.push({
          scope: "DEPARTMENT_SUBJECT",
          staffTermProfileId,
          classRoomDepartmentId: assignment.classRoomDepartmentId,
          departmentSubjectId,
        });
      }
      continue;
    }

    if (
      assignment.scope === "DEPARTMENT_SUBJECT" &&
      assignment.departmentSubjectId
    ) {
      academicAccessGrants.push({
        scope: "DEPARTMENT_SUBJECT",
        staffTermProfileId,
        classRoomDepartmentId: assignment.classRoomDepartmentId,
        departmentSubjectId: assignment.departmentSubjectId,
      });
    }
  }

  return {
    legacyClassroomAssignments,
    academicAccessGrants,
    selectedDepartmentSubjectIds:
      collectStaffAcademicAssignmentReferenceIds(assignments)
        .departmentSubjectIds,
  };
}

export function assertStaffAcademicAssignmentReferences({
  assignments,
  validClassIds,
  validClassRoomDepartmentIds,
  validSubjectIds,
  validDepartmentSubjects,
}: {
  assignments: NormalizedStaffAcademicAssignment[];
  validClassIds: IdRecord[];
  validClassRoomDepartmentIds: IdRecord[];
  validSubjectIds: IdRecord[];
  validDepartmentSubjects: Array<{
    id?: string | null;
    classRoomDepartmentId?: string | null;
  }>;
}) {
  const {
    classRoomIds,
    classRoomDepartmentIds,
    subjectIds,
    departmentSubjectIds,
  } = collectStaffAcademicAssignmentReferenceIds(assignments);

  if (toIdSet(validClassIds).size !== classRoomIds.length) {
    throw new Error("One or more selected classes are no longer valid.");
  }

  if (
    toIdSet(validClassRoomDepartmentIds).size !==
    classRoomDepartmentIds.length
  ) {
    throw new Error("One or more selected classrooms are no longer valid.");
  }

  if (toIdSet(validSubjectIds).size !== subjectIds.length) {
    throw new Error("One or more selected subjects are no longer valid.");
  }

  if (toIdSet(validDepartmentSubjects).size !== departmentSubjectIds.length) {
    throw new Error(
      "One or more selected department subjects are no longer valid.",
    );
  }

  const subjectToClassroom = new Map(
    validDepartmentSubjects
      .filter((subject) => subject.id)
      .map((subject) => [subject.id!, subject.classRoomDepartmentId]),
  );

  for (const assignment of assignments) {
    if (!assignment.classRoomDepartmentId) continue;

    for (const subjectId of [
      assignment.departmentSubjectId,
      ...assignment.departmentSubjectIds,
    ]) {
      if (
        subjectId &&
        subjectToClassroom.get(subjectId) !== assignment.classRoomDepartmentId
      ) {
        throw new Error(
          "Subjects must belong to the selected department assignment.",
        );
      }
    }
  }
}

export function mapStaffAcademicAccessGrantsToAssignments(
  grants: StaffAcademicGrantForForm[],
): StaffAcademicFormAssignment[] {
  const assignments = new Map<string, StaffAcademicFormAssignment>();

  for (const grant of grants) {
    if (grant.scope === "CLASS") {
      if (!grant.classRoomId) continue;
      assignments.set(`CLASS:${grant.classRoomId}`, {
        scope: "CLASS",
        classRoomId: grant.classRoomId,
        subjectAccessMode: "ALL",
        departmentSubjectIds: [],
      });
      continue;
    }

    if (grant.scope === "CLASS_SUBJECT") {
      if (!grant.classRoomId || !grant.subjectId) continue;
      assignments.set(`CLASS_SUBJECT:${grant.classRoomId}:${grant.subjectId}`, {
        scope: "CLASS_SUBJECT",
        classRoomId: grant.classRoomId,
        subjectId: grant.subjectId,
        subjectAccessMode: "SELECTED",
        departmentSubjectIds: [],
      });
      continue;
    }

    if (grant.scope === "DEPARTMENT") {
      if (!grant.classRoomDepartmentId) continue;
      assignments.set(`DEPARTMENT:${grant.classRoomDepartmentId}`, {
        scope: "DEPARTMENT",
        classRoomDepartmentId: grant.classRoomDepartmentId,
        subjectAccessMode: "ALL",
        departmentSubjectIds: [],
      });
      continue;
    }

    const classRoomDepartmentId =
      grant.classRoomDepartmentId ??
      grant.departmentSubject?.classRoomDepartmentId;
    if (!classRoomDepartmentId || !grant.departmentSubjectId) continue;

    const key = `DEPARTMENT:${classRoomDepartmentId}`;
    const current =
      assignments.get(key) ??
      ({
        scope: "DEPARTMENT",
        classRoomDepartmentId,
        subjectAccessMode: "SELECTED",
        departmentSubjectIds: [],
      } satisfies StaffAcademicFormAssignment);

    if (!current.departmentSubjectIds.includes(grant.departmentSubjectId)) {
      current.departmentSubjectIds.push(grant.departmentSubjectId);
    }
    assignments.set(key, current);
  }

  return Array.from(assignments.values());
}
