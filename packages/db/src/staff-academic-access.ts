import type { Database } from "./prisma";

type StaffAcademicAccessScope =
  | "CLASS"
  | "DEPARTMENT"
  | "CLASS_SUBJECT"
  | "DEPARTMENT_SUBJECT";

type ResolveStaffAcademicAccessInput = {
  db: Database;
  staffProfileId: string;
  schoolProfileId: string;
  schoolSessionId: string;
  sessionTermId: string;
};

export type StaffAcademicAccess = {
  classRoomDepartmentIds: string[];
  departmentSubjectIds: string[];
};

export async function resolveStaffAcademicAccess({
  db,
  staffProfileId,
  schoolProfileId,
  schoolSessionId,
  sessionTermId,
}: ResolveStaffAcademicAccessInput): Promise<StaffAcademicAccess> {
  const staffTermProfile = await db.staffTermProfile.findFirst({
    where: {
      deletedAt: null,
      schoolSessionId,
      sessionTermId,
      staffProfileId,
    },
    select: {
      id: true,
      academicAccessGrants: {
        where: {
          deletedAt: null,
        },
        select: {
          scope: true,
          classRoomId: true,
          classRoomDepartmentId: true,
          subjectId: true,
          departmentSubjectId: true,
        },
      },
      classroomsProfiles: {
        where: {
          deletedAt: null,
        },
        select: {
          classRoomDepartmentId: true,
          subjectAccessMode: true,
        },
      },
    },
  });

  if (!staffTermProfile) {
    return {
      classRoomDepartmentIds: [],
      departmentSubjectIds: [],
    };
  }

  const classRoomDepartmentIds = new Set<string>();
  const departmentSubjectIds = new Set<string>();
  const classGrantedDepartmentIds = new Set<string>();

  const legacyDepartmentIds = staffTermProfile.classroomsProfiles
    .map((assignment) => assignment.classRoomDepartmentId)
    .filter((id): id is string => Boolean(id));

  const legacyAllSubjectDepartmentIds = staffTermProfile.classroomsProfiles
    .filter((assignment) => assignment.subjectAccessMode === "ALL")
    .map((assignment) => assignment.classRoomDepartmentId)
    .filter((id): id is string => Boolean(id));

  const explicitLegacySubjects = await db.staffSubject.findMany({
    where: {
      deletedAt: null,
      staffProfilesId: staffProfileId,
      departmentSubject: {
        deletedAt: null,
        sessionTermId,
        classRoomDepartment: {
          deletedAt: null,
          schoolProfileId,
          classRoom: {
            deletedAt: null,
            schoolSessionId,
          },
        },
      },
    },
    select: {
      departmentSubjectId: true,
      departmentSubject: {
        select: {
          classRoomDepartmentId: true,
        },
      },
    },
  });

  for (const staffSubject of explicitLegacySubjects) {
    if (staffSubject.departmentSubjectId) {
      departmentSubjectIds.add(staffSubject.departmentSubjectId);
    }
    if (staffSubject.departmentSubject?.classRoomDepartmentId) {
      classRoomDepartmentIds.add(staffSubject.departmentSubject.classRoomDepartmentId);
    }
  }

  const grants = staffTermProfile.academicAccessGrants as Array<{
    scope: StaffAcademicAccessScope;
    classRoomId: string | null;
    classRoomDepartmentId: string | null;
    subjectId: string | null;
    departmentSubjectId: string | null;
  }>;

  const classGrantIds = grants
    .filter((grant) => grant.scope === "CLASS" && grant.classRoomId)
    .map((grant) => grant.classRoomId!);
  const departmentGrantIds = grants
    .filter((grant) => grant.scope === "DEPARTMENT" && grant.classRoomDepartmentId)
    .map((grant) => grant.classRoomDepartmentId!);
  const departmentSubjectGrantIds = grants
    .filter(
      (grant) =>
        grant.scope === "DEPARTMENT_SUBJECT" && grant.departmentSubjectId,
    )
    .map((grant) => grant.departmentSubjectId!);
  const classSubjectGrants = grants.filter(
    (grant) =>
      grant.scope === "CLASS_SUBJECT" && grant.classRoomId && grant.subjectId,
  );

  if (classGrantIds.length) {
    const departments = await db.classRoomDepartment.findMany({
      where: {
        deletedAt: null,
        schoolProfileId,
        classRoomsId: {
          in: classGrantIds,
        },
        classRoom: {
          deletedAt: null,
          schoolSessionId,
        },
      },
      select: {
        id: true,
      },
    });

    for (const department of departments) {
      classRoomDepartmentIds.add(department.id);
      classGrantedDepartmentIds.add(department.id);
    }
  }

  const directDepartmentIds = Array.from(
    new Set([...legacyDepartmentIds, ...departmentGrantIds]),
  );
  const validDirectDepartments = directDepartmentIds.length
    ? await db.classRoomDepartment.findMany({
        where: {
          id: {
            in: directDepartmentIds,
          },
          deletedAt: null,
          schoolProfileId,
          classRoom: {
            deletedAt: null,
            schoolSessionId,
          },
        },
        select: {
          id: true,
        },
      })
    : [];
  const validDirectDepartmentIds = new Set(
    validDirectDepartments.map((department) => department.id),
  );

  for (const departmentId of validDirectDepartmentIds) {
    classRoomDepartmentIds.add(departmentId);
  }

  const allSubjectDepartmentIds = [
    ...legacyAllSubjectDepartmentIds.filter((departmentId) =>
      validDirectDepartmentIds.has(departmentId),
    ),
    ...departmentGrantIds.filter((departmentId) =>
      validDirectDepartmentIds.has(departmentId),
    ),
    ...Array.from(classGrantedDepartmentIds),
  ];

  if (allSubjectDepartmentIds.length) {
    const subjects = await db.departmentSubject.findMany({
      where: {
        deletedAt: null,
        sessionTermId,
        classRoomDepartmentId: {
          in: Array.from(new Set(allSubjectDepartmentIds)),
        },
        classRoomDepartment: {
          deletedAt: null,
          schoolProfileId,
          classRoom: {
            deletedAt: null,
            schoolSessionId,
          },
        },
      },
      select: {
        id: true,
        classRoomDepartmentId: true,
      },
    });

    for (const subject of subjects) {
      departmentSubjectIds.add(subject.id);
      if (subject.classRoomDepartmentId) {
        classRoomDepartmentIds.add(subject.classRoomDepartmentId);
      }
    }
  }

  if (classSubjectGrants.length) {
    const subjects = await db.departmentSubject.findMany({
      where: {
        deletedAt: null,
        sessionTermId,
        OR: classSubjectGrants.map((grant) => ({
          subjectId: grant.subjectId!,
          classRoomDepartment: {
            deletedAt: null,
            schoolProfileId,
            classRoomsId: grant.classRoomId!,
            classRoom: {
              deletedAt: null,
              schoolSessionId,
            },
          },
        })),
      },
      select: {
        id: true,
        classRoomDepartmentId: true,
      },
    });

    for (const subject of subjects) {
      departmentSubjectIds.add(subject.id);
      if (subject.classRoomDepartmentId) {
        classRoomDepartmentIds.add(subject.classRoomDepartmentId);
      }
    }
  }

  if (departmentSubjectGrantIds.length) {
    const subjects = await db.departmentSubject.findMany({
      where: {
        id: {
          in: departmentSubjectGrantIds,
        },
        deletedAt: null,
        sessionTermId,
        classRoomDepartment: {
          deletedAt: null,
          schoolProfileId,
          classRoom: {
            deletedAt: null,
            schoolSessionId,
          },
        },
      },
      select: {
        id: true,
        classRoomDepartmentId: true,
      },
    });

    for (const subject of subjects) {
      departmentSubjectIds.add(subject.id);
      if (subject.classRoomDepartmentId) {
        classRoomDepartmentIds.add(subject.classRoomDepartmentId);
      }
    }
  }

  return {
    classRoomDepartmentIds: Array.from(classRoomDepartmentIds),
    departmentSubjectIds: Array.from(departmentSubjectIds),
  };
}
