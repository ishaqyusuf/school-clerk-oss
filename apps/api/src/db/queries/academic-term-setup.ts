import type { TRPCContext } from "@api/trpc/init";
import type {
  AcademicTermSetupApply,
  AcademicTermSetupSelection,
  CreateAcademicTermDraft,
} from "@api/trpc/schemas/academic-term-setup";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import {
  classroomListOrderBy,
  nestedClassroomDepartmentListOrderBy,
} from "@school-clerk/db";
import { requireAcademicAdmin } from "./academic-access";

type AcademicDb = any;
type OrderedTerm = {
  id: string;
  startDate: Date | null;
  createdAt: Date | null;
};
type TenantTerm = OrderedTerm & {
  sessionId: string;
  title: string;
  endDate: Date | null;
  lifecycleStatus: "DRAFT" | "READY" | "ACTIVE" | "CLOSED" | null;
  setupCompletedAt: Date | null;
  note: string | null;
  session: {
    id: string;
    title: string;
  };
};

type SourceClassroom = {
  id: string;
  name: string | null;
  classLevel: number | null;
  classRoomDepartments: {
    id: string;
    departmentName: string | null;
    departmentLevel: number | null;
  }[];
};

type SourceClassroomDepartmentReference = {
  id: string;
  departmentName: string | null;
  departmentLevel: number | null;
  classRoom: {
    id: string;
    name: string | null;
    classLevel: number | null;
  } | null;
};

type SourceDepartmentSubject = {
  id: string;
  subjectId: string;
  classRoomDepartmentId: string | null;
  description: string | null;
  subject: { title: string };
  classRoomDepartment: SourceClassroomDepartmentReference | null;
  assessments: {
    id: number;
    title: string;
    obtainable: number | null;
    percentageObtainable: number | null;
    index: number | null;
    isGroup: boolean;
    printMode: "EXPANDED" | "TOTAL";
    parentAssessmentId: number | null;
  }[];
};

type SourceData = {
  id: string;
  title: string;
  sessionId: string;
  session: {
    id: string;
    title: string;
    classRooms: SourceClassroom[];
  };
  departmentSubjects: SourceDepartmentSubject[];
  termForms: {
    id: string;
    studentId: string | null;
    studentSessionFormId: string;
    classroomDepartmentId: string | null;
    student: {
      id: string;
      name: string;
      surname: string | null;
      otherName: string | null;
    } | null;
    classroomDepartment: SourceClassroomDepartmentReference | null;
  }[];
  staffTermProfiles: {
    id: string;
    staffProfileId: string;
    staffProfile: {
      id: string;
      name: string;
      subjects: {
        departmentSubjectId: string | null;
      }[];
    };
    classroomsProfiles: {
      classRoomDepartmentId: string | null;
      subjectAccessMode: "SELECTED" | "ALL";
      classRoomDepartment: SourceClassroomDepartmentReference | null;
    }[];
    academicAccessGrants: {
      scope: "CLASS" | "DEPARTMENT" | "CLASS_SUBJECT" | "DEPARTMENT_SUBJECT";
      classRoomId: string | null;
      classRoomDepartmentId: string | null;
      subjectId: string | null;
      departmentSubjectId: string | null;
      classRoom: {
        id: string;
        name: string | null;
        classLevel: number | null;
      } | null;
      classRoomDepartment: SourceClassroomDepartmentReference | null;
    }[];
  }[];
};

type TargetClassroom = SourceClassroom;

type SetupCounts = {
  classrooms: number;
  subjects: number;
  assessments: number;
  students: number;
  teachers: number;
  fees: number;
};

const emptyCounts = (): SetupCounts => ({
  classrooms: 0,
  subjects: 0,
  assessments: 0,
  students: 0,
  teachers: 0,
  fees: 0,
});

function termOrderValue(term: OrderedTerm) {
  return term.startDate?.getTime() ?? term.createdAt?.getTime() ?? 0;
}

export function findPreviousAcademicTerm<T extends OrderedTerm>(
  terms: T[],
  targetTermId: string,
) {
  const ordered = [...terms].sort((left, right) => {
    const byDate = termOrderValue(left) - termOrderValue(right);
    if (byDate !== 0) return byDate;
    return left.id.localeCompare(right.id);
  });
  const targetIndex = ordered.findIndex((term) => term.id === targetTermId);
  return targetIndex > 0 ? ordered[targetIndex - 1] : null;
}

function selectedIds(
  option: AcademicTermSetupSelection["subjectOption"],
  explicitIds: string[],
  allIds: string[],
) {
  if (option === "empty") return [];
  return option === "copy-all" ? allIds : explicitIds;
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function setupConfigurationFingerprint(value: unknown) {
  const record =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const sortedStrings = (input: unknown) =>
    Array.isArray(input)
      ? input.filter((item): item is string => typeof item === "string").sort()
      : [];
  return JSON.stringify({
    termId: record.termId,
    previousTermId: record.previousTermId ?? null,
    classroomOption: record.classroomOption,
    subjectOption: record.subjectOption,
    studentOption: record.studentOption,
    teacherOption: record.teacherOption,
    selectedClassroomIds: sortedStrings(record.selectedClassroomIds),
    selectedSubjectIds: sortedStrings(record.selectedSubjectIds),
    selectedStudentIds: sortedStrings(record.selectedStudentIds),
    selectedTeacherIds: sortedStrings(record.selectedTeacherIds),
    idempotencyKey: record.idempotencyKey,
  });
}

function displayStudent(student: {
  name: string;
  surname: string | null;
  otherName: string | null;
}) {
  return [student.name, student.surname, student.otherName]
    .filter(Boolean)
    .join(" ");
}

function classKey(value: { name: string | null }) {
  return value.name?.trim().toLocaleLowerCase() ?? null;
}

function departmentKey(value: { departmentName: string | null }) {
  return value.departmentName?.trim().toLocaleLowerCase() ?? null;
}

export async function assertAcademicTermWritable(
  ctx: TRPCContext,
  termId: string | null | undefined,
  expectedSchoolProfileId = ctx.profile.schoolId,
) {
  if (!termId || !expectedSchoolProfileId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Select an academic term before making this change.",
    });
  }

  const term = await ctx.db.sessionTerm.findFirst({
    where: {
      id: termId,
      schoolId: expectedSchoolProfileId,
      deletedAt: null,
    },
    select: {
      id: true,
      lifecycleStatus: true,
    },
  });

  if (!term) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Academic term was not found.",
    });
  }
  if (term.lifecycleStatus === "CLOSED") {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "This academic term is closed. Reopen it through an approved administrative process before changing academic records.",
    });
  }

  return term;
}

async function getTenantTerms(
  db: AcademicDb,
  schoolProfileId: string,
): Promise<TenantTerm[]> {
  return db.sessionTerm.findMany({
    where: {
      schoolId: schoolProfileId,
      deletedAt: null,
    },
    select: {
      id: true,
      sessionId: true,
      title: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      lifecycleStatus: true,
      setupCompletedAt: true,
      note: true,
      session: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });
}

async function resolveSetupTerms(
  db: AcademicDb,
  schoolProfileId: string,
  targetTermId: string,
  requestedSourceTermId?: string | null,
) {
  const terms = await getTenantTerms(db, schoolProfileId);
  const target = terms.find((term) => term.id === targetTermId);
  if (!target) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "The target academic term was not found.",
    });
  }
  const source =
    requestedSourceTermId === null
      ? null
      : requestedSourceTermId
        ? terms.find((term) => term.id === requestedSourceTermId)
        : findPreviousAcademicTerm(terms, targetTermId);
  if (requestedSourceTermId && !source) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "The source academic term was not found.",
    });
  }
  if (source?.id === target.id) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Source and target terms must be different.",
    });
  }
  return { source: source ?? null, target, terms };
}

async function loadSourceData(
  db: AcademicDb,
  schoolProfileId: string,
  sourceTermId: string,
) {
  return (await db.sessionTerm.findFirst({
    where: {
      id: sourceTermId,
      schoolId: schoolProfileId,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      sessionId: true,
      session: {
        select: {
          id: true,
          title: true,
          classRooms: {
            where: { deletedAt: null },
            orderBy: classroomListOrderBy,
            select: {
              id: true,
              name: true,
              classLevel: true,
              classRoomDepartments: {
                where: { deletedAt: null },
                orderBy: nestedClassroomDepartmentListOrderBy,
                select: {
                  id: true,
                  departmentName: true,
                  departmentLevel: true,
                },
              },
            },
          },
        },
      },
      departmentSubjects: {
        where: { deletedAt: null },
        select: {
          id: true,
          subjectId: true,
          classRoomDepartmentId: true,
          description: true,
          subject: { select: { title: true } },
          classRoomDepartment: {
            select: {
              id: true,
              departmentName: true,
              departmentLevel: true,
              classRoom: {
                select: { id: true, name: true, classLevel: true },
              },
            },
          },
          assessments: {
            where: { deletedAt: null },
            orderBy: [{ index: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              title: true,
              obtainable: true,
              percentageObtainable: true,
              index: true,
              isGroup: true,
              printMode: true,
              parentAssessmentId: true,
            },
          },
        },
      },
      termForms: {
        where: { deletedAt: null, studentId: { not: null } },
        select: {
          id: true,
          studentId: true,
          studentSessionFormId: true,
          classroomDepartmentId: true,
          student: {
            select: {
              id: true,
              name: true,
              surname: true,
              otherName: true,
            },
          },
          classroomDepartment: {
            select: {
              id: true,
              departmentName: true,
              departmentLevel: true,
              classRoom: {
                select: { id: true, name: true, classLevel: true },
              },
            },
          },
        },
      },
      staffTermProfiles: {
        where: {
          deletedAt: null,
          staffProfile: { deletedAt: null, schoolProfileId },
        },
        select: {
          id: true,
          staffProfileId: true,
          staffProfile: {
            select: {
              id: true,
              name: true,
              subjects: {
                where: {
                  deletedAt: null,
                  departmentSubject: {
                    sessionTermId: sourceTermId,
                    deletedAt: null,
                  },
                },
                select: {
                  departmentSubjectId: true,
                },
              },
            },
          },
          classroomsProfiles: {
            where: { deletedAt: null },
            select: {
              classRoomDepartmentId: true,
              subjectAccessMode: true,
              classRoomDepartment: {
                select: {
                  id: true,
                  departmentName: true,
                  departmentLevel: true,
                  classRoom: {
                    select: { id: true, name: true, classLevel: true },
                  },
                },
              },
            },
          },
          academicAccessGrants: {
            where: { deletedAt: null },
            select: {
              scope: true,
              classRoomId: true,
              classRoomDepartmentId: true,
              subjectId: true,
              departmentSubjectId: true,
              classRoom: {
                select: { id: true, name: true, classLevel: true },
              },
              classRoomDepartment: {
                select: {
                  id: true,
                  departmentName: true,
                  departmentLevel: true,
                  classRoom: {
                    select: { id: true, name: true, classLevel: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })) as SourceData | null;
}

async function loadTargetClassrooms(
  db: AcademicDb,
  schoolProfileId: string,
  sessionId: string,
) {
  return (await db.classRoom.findMany({
    where: {
      schoolProfileId,
      schoolSessionId: sessionId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      classLevel: true,
      classRoomDepartments: {
        where: { deletedAt: null },
        orderBy: nestedClassroomDepartmentListOrderBy,
        select: {
          id: true,
          departmentName: true,
          departmentLevel: true,
        },
      },
    },
    orderBy: classroomListOrderBy,
  })) as TargetClassroom[];
}

function buildExistingClassroomMaps(
  sourceClasses: SourceClassroom[],
  targetClasses: TargetClassroom[],
) {
  const classMap = new Map<string, string>();
  const departmentMap = new Map<string, string>();
  const targetByName = new Map(
    targetClasses
      .map((item) => [classKey(item), item] as const)
      .filter((entry): entry is [string, (typeof targetClasses)[number]] =>
        Boolean(entry[0]),
      ),
  );
  for (const sourceClass of sourceClasses) {
    const key = classKey(sourceClass);
    const targetClass = key ? targetByName.get(key) : null;
    if (!targetClass) continue;
    classMap.set(sourceClass.id, targetClass.id);
    const targetDepartments = new Map(
      targetClass.classRoomDepartments
        .map((item) => [departmentKey(item), item.id] as const)
        .filter((entry): entry is [string, string] => Boolean(entry[0])),
    );
    for (const sourceDepartment of sourceClass.classRoomDepartments) {
      const departmentNameKey = departmentKey(sourceDepartment);
      const targetDepartmentId = departmentNameKey
        ? targetDepartments.get(departmentNameKey)
        : null;
      if (targetDepartmentId) {
        departmentMap.set(sourceDepartment.id, targetDepartmentId);
      }
    }
  }
  return { classMap, departmentMap };
}

function collectReferencedClassrooms(
  source: NonNullable<Awaited<ReturnType<typeof loadSourceData>>>,
) {
  const classrooms = new Map<string, SourceClassroom>();
  const ensureClassroom = (classroom: {
    id: string;
    name: string | null;
    classLevel: number | null;
  }) => {
    const existing = classrooms.get(classroom.id);
    if (existing) return existing;
    const created = { ...classroom, classRoomDepartments: [] };
    classrooms.set(classroom.id, created);
    return created;
  };
  const addDepartment = (
    department: SourceClassroomDepartmentReference | null,
  ) => {
    if (!department?.classRoom) return;
    const classroom = ensureClassroom(department.classRoom);
    if (
      !classroom.classRoomDepartments.some((item) => item.id === department.id)
    ) {
      classroom.classRoomDepartments.push({
        id: department.id,
        departmentName: department.departmentName,
        departmentLevel: department.departmentLevel,
      });
    }
  };

  for (const classroom of source.session.classRooms) {
    classrooms.set(classroom.id, {
      ...classroom,
      classRoomDepartments: [...classroom.classRoomDepartments],
    });
  }
  for (const subject of source.departmentSubjects) {
    addDepartment(subject.classRoomDepartment);
  }
  for (const termForm of source.termForms) {
    addDepartment(termForm.classroomDepartment);
  }
  for (const profile of source.staffTermProfiles) {
    for (const assignment of profile.classroomsProfiles) {
      addDepartment(assignment.classRoomDepartment);
    }
    for (const grant of profile.academicAccessGrants) {
      if (grant.classRoom) ensureClassroom(grant.classRoom);
      addDepartment(grant.classRoomDepartment);
    }
  }

  return [...classrooms.values()];
}

function addSameSessionIdentityMappings(
  maps: ReturnType<typeof buildExistingClassroomMaps>,
  sourceClasses: SourceClassroom[],
) {
  for (const classroom of sourceClasses) {
    maps.classMap.set(classroom.id, classroom.id);
    for (const department of classroom.classRoomDepartments) {
      maps.departmentMap.set(department.id, department.id);
    }
  }
  return maps;
}

function setupSelections(
  source: NonNullable<Awaited<ReturnType<typeof loadSourceData>>>,
  input: AcademicTermSetupSelection,
) {
  return {
    classroomIds: unique(
      selectedIds(
        input.classroomOption,
        input.selectedClassroomIds,
        source.session.classRooms.map((item) => item.id),
      ),
    ),
    subjectIds: unique(
      selectedIds(
        input.subjectOption,
        input.selectedSubjectIds,
        source.departmentSubjects.map((item) => item.id),
      ),
    ),
    studentIds: unique(
      selectedIds(
        input.studentOption,
        input.selectedStudentIds,
        source.termForms
          .map((item) => item.studentId)
          .filter((id): id is string => Boolean(id)),
      ),
    ),
    teacherIds: unique(
      selectedIds(
        input.teacherOption,
        input.selectedTeacherIds,
        source.staffTermProfiles.map((item) => item.staffProfileId),
      ),
    ),
  };
}

function validateSelectedIds(
  label: string,
  selected: string[],
  available: string[],
  blockers: { key: string; message: string }[],
) {
  const availableSet = new Set(available);
  const invalid = selected.filter((id) => !availableSet.has(id));
  if (invalid.length) {
    blockers.push({
      key: `invalid-${label}-selection`,
      message: `One or more selected ${label} records are no longer available.`,
    });
  }
}

async function buildTermSetupPreview(
  db: AcademicDb,
  schoolProfileId: string,
  input: AcademicTermSetupSelection,
) {
  const { source: sourceTerm, target } = await resolveSetupTerms(
    db,
    schoolProfileId,
    input.termId,
    input.previousTermId,
  );
  const blockers: { key: string; message: string }[] = [];
  const warnings: { key: string; message: string }[] = [];
  if (
    target.lifecycleStatus === "ACTIVE" ||
    target.lifecycleStatus === "CLOSED"
  ) {
    blockers.push({
      key: "target-not-configurable",
      message: `A ${target.lifecycleStatus.toLowerCase()} term cannot be configured.`,
    });
  }
  if (!sourceTerm) {
    return {
      source: null,
      target,
      promotional: false,
      blockers:
        input.classroomOption === "empty" &&
        input.subjectOption === "empty" &&
        input.studentOption === "empty" &&
        input.teacherOption === "empty"
          ? blockers
          : [
              ...blockers,
              {
                key: "missing-source-term",
                message:
                  "No previous term exists. Choose empty setup options and configure the first term manually.",
              },
            ],
      warnings,
      available: {
        classrooms: [],
        subjects: [],
        students: [],
        teachers: [],
      },
      counts: emptyCounts(),
    };
  }
  const source = await loadSourceData(db, schoolProfileId, sourceTerm.id);
  if (!source) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "The source academic term is no longer available.",
    });
  }
  const promotional = source.sessionId !== target.sessionId;
  const selections = setupSelections(source, input);
  validateSelectedIds(
    "classroom",
    selections.classroomIds,
    source.session.classRooms.map((item) => item.id),
    blockers,
  );
  validateSelectedIds(
    "subject",
    selections.subjectIds,
    source.departmentSubjects.map((item) => item.id),
    blockers,
  );
  validateSelectedIds(
    "student",
    selections.studentIds,
    source.termForms
      .map((item) => item.studentId)
      .filter((id): id is string => Boolean(id)),
    blockers,
  );
  validateSelectedIds(
    "teacher",
    selections.teacherIds,
    source.staffTermProfiles.map((item) => item.staffProfileId),
    blockers,
  );
  if (promotional && selections.studentIds.length) {
    blockers.push({
      key: "student-progression-required",
      message:
        "Students must be progressed into the new session after academic structure setup.",
    });
  }

  const targetClassrooms = await loadTargetClassrooms(
    db,
    schoolProfileId,
    target.sessionId,
  );
  const referencedClassrooms = collectReferencedClassrooms(source);
  const existingMaps = buildExistingClassroomMaps(
    referencedClassrooms,
    targetClassrooms,
  );
  if (!promotional) {
    addSameSessionIdentityMappings(existingMaps, source.session.classRooms);
  }
  const selectedClassroomSet = new Set(selections.classroomIds);
  const selectedStructureMaps = buildExistingClassroomMaps(
    referencedClassrooms,
    source.session.classRooms.filter((item) =>
      selectedClassroomSet.has(item.id),
    ),
  );
  const selectedSubjectSet = new Set(selections.subjectIds);
  const requiredDepartmentSubjectIds = new Set<string>();
  const canMapClassroom = (classroomId: string) =>
    existingMaps.classMap.has(classroomId) ||
    selectedStructureMaps.classMap.has(classroomId);
  const canMapDepartment = (departmentId: string) => {
    return (
      existingMaps.departmentMap.has(departmentId) ||
      selectedStructureMaps.departmentMap.has(departmentId)
    );
  };
  for (const profile of source.staffTermProfiles) {
    if (!selections.teacherIds.includes(profile.staffProfileId)) continue;
    for (const assignment of profile.classroomsProfiles) {
      if (
        assignment.classRoomDepartmentId &&
        !canMapDepartment(assignment.classRoomDepartmentId)
      ) {
        blockers.push({
          key: "teacher-classroom-not-mapped",
          message:
            "Selected teachers require classroom records that are neither present nor selected for rollover.",
        });
        break;
      }
    }
    for (const grant of profile.academicAccessGrants) {
      if (grant.classRoomId && !canMapClassroom(grant.classRoomId)) {
        blockers.push({
          key: "teacher-classroom-grant-not-mapped",
          message:
            "Selected teacher access grants require classrooms that are neither present nor selected for rollover.",
        });
        break;
      }
      if (
        grant.classRoomDepartmentId &&
        !canMapDepartment(grant.classRoomDepartmentId)
      ) {
        blockers.push({
          key: "teacher-department-grant-not-mapped",
          message:
            "Selected teacher access grants require classroom departments that are neither present nor selected for rollover.",
        });
        break;
      }
      if (grant.departmentSubjectId) {
        requiredDepartmentSubjectIds.add(grant.departmentSubjectId);
      }
    }
    for (const subject of profile.staffProfile.subjects) {
      if (subject.departmentSubjectId) {
        requiredDepartmentSubjectIds.add(subject.departmentSubjectId);
      }
    }
  }
  for (const requiredId of requiredDepartmentSubjectIds) {
    if (!selectedSubjectSet.has(requiredId)) {
      blockers.push({
        key: "teacher-subject-not-selected",
        message:
          "Selected teacher assignments require subject records that are not selected for rollover.",
      });
      break;
    }
  }
  for (const sourceSubject of source.departmentSubjects) {
    if (!selectedSubjectSet.has(sourceSubject.id)) continue;
    const sourceDepartmentId = sourceSubject.classRoomDepartmentId;
    if (!sourceDepartmentId) continue;
    if (!canMapDepartment(sourceDepartmentId)) {
      blockers.push({
        key: "subject-classroom-not-mapped",
        message:
          "Selected subjects require classrooms that are neither present nor selected for rollover.",
      });
      break;
    }
  }
  if (promotional) {
    const invalidClassroom = source.session.classRooms.find(
      (item) => selectedClassroomSet.has(item.id) && !classKey(item),
    );
    if (invalidClassroom) {
      blockers.push({
        key: "unnamed-classroom",
        message: "Every copied classroom must have a name.",
      });
    }
  } else if (input.classroomOption !== "empty") {
    warnings.push({
      key: "classrooms-reused",
      message: "Classrooms are session-based and will be reused for this term.",
    });
  }

  const selectedSubjects = source.departmentSubjects.filter((item) =>
    selectedSubjectSet.has(item.id),
  );
  const selectedStudentSet = new Set(selections.studentIds);
  const selectedTeacherSet = new Set(selections.teacherIds);
  const counts = emptyCounts();
  counts.classrooms = promotional
    ? source.session.classRooms.filter(
        (item) =>
          selectedClassroomSet.has(item.id) &&
          !existingMaps.classMap.has(item.id),
      ).length
    : 0;
  counts.subjects = selectedSubjects.length;
  counts.assessments = selectedSubjects.reduce(
    (total, item) => total + item.assessments.length,
    0,
  );
  counts.students = promotional ? 0 : selectedStudentSet.size;
  counts.teachers = selectedTeacherSet.size;
  if (!promotional && selectedStudentSet.size) {
    const selectedDepartments = unique(
      source.termForms
        .filter(
          (item) => item.studentId && selectedStudentSet.has(item.studentId),
        )
        .map((item) => item.classroomDepartmentId)
        .filter((id): id is string => Boolean(id)),
    );
    const feeItems = selectedDepartments.length
      ? await db.financeItem.findMany({
          where: {
            schoolProfileId,
            isActive: true,
            deletedAt: null,
            applicableClasses: {
              some: {
                classRoomDepartmentId: { in: selectedDepartments },
                deletedAt: null,
              },
            },
          },
          select: {
            applicableClasses: {
              where: {
                deletedAt: null,
                classRoomDepartmentId: { in: selectedDepartments },
              },
              select: { classRoomDepartmentId: true },
            },
          },
        })
      : [];
    const feeCountByDepartment = new Map<string, number>();
    for (const item of feeItems) {
      for (const applicability of item.applicableClasses) {
        feeCountByDepartment.set(
          applicability.classRoomDepartmentId,
          (feeCountByDepartment.get(applicability.classRoomDepartmentId) ?? 0) +
            1,
        );
      }
    }
    counts.fees = source.termForms
      .filter(
        (item) => item.studentId && selectedStudentSet.has(item.studentId),
      )
      .reduce(
        (total, item) =>
          total +
          (item.classroomDepartmentId
            ? (feeCountByDepartment.get(item.classroomDepartmentId) ?? 0)
            : 0),
        0,
      );
  }
  return {
    source: {
      id: source.id,
      title: source.title,
      sessionId: source.sessionId,
      sessionTitle: source.session.title,
    },
    target,
    promotional,
    blockers,
    warnings,
    available: {
      classrooms: source.session.classRooms.map((item) => ({
        id: item.id,
        label: item.name ?? "Unnamed classroom",
      })),
      subjects: source.departmentSubjects.map((item) => ({
        id: item.id,
        label: item.subject.title,
        context: [
          item.classRoomDepartment?.classRoom?.name,
          item.classRoomDepartment?.departmentName,
        ]
          .filter(Boolean)
          .join(" "),
      })),
      students: source.termForms
        .filter(
          (
            item,
          ): item is typeof item & {
            studentId: string;
            student: NonNullable<typeof item.student>;
          } => Boolean(item.studentId && item.student),
        )
        .map((item) => ({
          id: item.studentId,
          label: displayStudent(item.student),
          context: [
            item.classroomDepartment?.classRoom?.name,
            item.classroomDepartment?.departmentName,
          ]
            .filter(Boolean)
            .join(" "),
        })),
      teachers: source.staffTermProfiles.map((item) => ({
        id: item.staffProfileId,
        label: item.staffProfile.name,
        context: `${item.classroomsProfiles.length + item.academicAccessGrants.length} assignments`,
      })),
    },
    counts,
  };
}

export async function getAcademicTermSetupContext(
  ctx: TRPCContext,
  input: { termId: string; previousTermId?: string | null },
) {
  const { schoolProfileId } = await requireAcademicAdmin(ctx);
  const preview = await buildTermSetupPreview(ctx.db, schoolProfileId, {
    termId: input.termId,
    previousTermId: input.previousTermId,
    classroomOption: "copy-all",
    subjectOption: "copy-all",
    studentOption: "empty",
    teacherOption: "copy-all",
    selectedClassroomIds: [],
    selectedSubjectIds: [],
    selectedStudentIds: [],
    selectedTeacherIds: [],
  });
  const latestRun = await ctx.db.academicTermSetupRun.findFirst({
    where: {
      schoolProfileId,
      targetTermId: input.termId,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      result: true,
      errorMessage: true,
      completedAt: true,
    },
  });
  return { ...preview, latestRun };
}

export async function previewAcademicTermSetup(
  ctx: TRPCContext,
  input: AcademicTermSetupSelection,
) {
  const { schoolProfileId } = await requireAcademicAdmin(ctx);
  return buildTermSetupPreview(ctx.db, schoolProfileId, input);
}

async function createClassroomMappings(
  tx: AcademicDb,
  schoolProfileId: string,
  source: NonNullable<Awaited<ReturnType<typeof loadSourceData>>>,
  targetSessionId: string,
  selectedClassroomIds: string[],
) {
  const targetClasses = await loadTargetClassrooms(
    tx,
    schoolProfileId,
    targetSessionId,
  );
  const referencedClassrooms = collectReferencedClassrooms(source);
  let maps = buildExistingClassroomMaps(referencedClassrooms, targetClasses);
  if (source.sessionId === targetSessionId) {
    maps = addSameSessionIdentityMappings(maps, source.session.classRooms);
  }
  const selectedSet = new Set(selectedClassroomIds);
  const resolvedTargetClasses = [...targetClasses];
  let created = 0;
  for (const sourceClass of source.session.classRooms) {
    if (maps.classMap.has(sourceClass.id) || !selectedSet.has(sourceClass.id)) {
      continue;
    }
    if (!sourceClass.name) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Every copied classroom must have a name.",
      });
    }
    const targetClass = await tx.classRoom.create({
      data: {
        name: sourceClass.name,
        classLevel: sourceClass.classLevel,
        schoolProfileId,
        schoolSessionId: targetSessionId,
      },
      select: { id: true },
    });
    created += 1;
    maps.classMap.set(sourceClass.id, targetClass.id);
    const createdDepartments: SourceClassroom["classRoomDepartments"] = [];
    for (const sourceDepartment of sourceClass.classRoomDepartments) {
      const targetDepartment = await tx.classRoomDepartment.create({
        data: {
          departmentName: sourceDepartment.departmentName,
          departmentLevel: sourceDepartment.departmentLevel,
          classRoomsId: targetClass.id,
          schoolProfileId,
        },
        select: { id: true },
      });
      maps.departmentMap.set(sourceDepartment.id, targetDepartment.id);
      createdDepartments.push({
        id: targetDepartment.id,
        departmentName: sourceDepartment.departmentName,
        departmentLevel: sourceDepartment.departmentLevel,
      });
    }
    resolvedTargetClasses.push({
      id: targetClass.id,
      name: sourceClass.name,
      classLevel: sourceClass.classLevel,
      classRoomDepartments: createdDepartments,
    });
  }
  maps = buildExistingClassroomMaps(
    referencedClassrooms,
    resolvedTargetClasses,
  );
  if (source.sessionId === targetSessionId) {
    maps = addSameSessionIdentityMappings(maps, source.session.classRooms);
  }
  return { ...maps, created };
}

async function copyAssessments(
  tx: AcademicDb,
  sourceAssessments: SourceDepartmentSubject["assessments"],
  targetDepartmentSubjectId: string,
) {
  const existing: {
    id: number;
    title: string;
    index: number | null;
    parentAssessmentId: number | null;
  }[] = await tx.classroomSubjectAssessment.findMany({
    where: {
      departmentSubjectId: targetDepartmentSubjectId,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      index: true,
      parentAssessmentId: true,
    },
  });
  const sourceToTarget = new Map<number, number>();
  let createdCount = 0;
  const ordered = [...sourceAssessments].sort((left, right) => {
    if (left.parentAssessmentId === null && right.parentAssessmentId !== null) {
      return -1;
    }
    if (left.parentAssessmentId !== null && right.parentAssessmentId === null) {
      return 1;
    }
    return (left.index ?? 0) - (right.index ?? 0);
  });
  for (const assessment of ordered) {
    const targetParentId = assessment.parentAssessmentId
      ? (sourceToTarget.get(assessment.parentAssessmentId) ?? null)
      : null;
    const match = existing.find(
      (item) =>
        item.title === assessment.title &&
        item.index === assessment.index &&
        item.parentAssessmentId === targetParentId,
    );
    if (match) {
      sourceToTarget.set(assessment.id, match.id);
      continue;
    }
    const created = await tx.classroomSubjectAssessment.create({
      data: {
        title: assessment.title,
        obtainable: assessment.obtainable,
        percentageObtainable: assessment.percentageObtainable,
        index: assessment.index,
        isGroup: assessment.isGroup,
        printMode: assessment.printMode,
        parentAssessmentId: targetParentId,
        departmentSubjectId: targetDepartmentSubjectId,
      },
      select: { id: true },
    });
    createdCount += 1;
    sourceToTarget.set(assessment.id, created.id);
  }
  return createdCount;
}

async function applySetupTransaction(
  tx: AcademicDb,
  schoolProfileId: string,
  input: AcademicTermSetupApply,
  preview: Awaited<ReturnType<typeof buildTermSetupPreview>>,
) {
  if (!preview.source) {
    await tx.sessionTerm.update({
      where: { id: input.termId },
      data: {
        lifecycleStatus: "READY",
        setupCompletedAt: new Date(),
      },
    });
    return emptyCounts();
  }
  const source = await loadSourceData(tx, schoolProfileId, preview.source.id);
  if (!source) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "The source academic term is no longer available.",
    });
  }
  const selections = setupSelections(source, input);
  const selectionBlockers: { key: string; message: string }[] = [];
  validateSelectedIds(
    "subject",
    selections.subjectIds,
    source.departmentSubjects.map((item) => item.id),
    selectionBlockers,
  );
  validateSelectedIds(
    "student",
    selections.studentIds,
    source.termForms
      .map((item) => item.studentId)
      .filter((id): id is string => Boolean(id)),
    selectionBlockers,
  );
  validateSelectedIds(
    "teacher",
    selections.teacherIds,
    source.staffTermProfiles.map((item) => item.staffProfileId),
    selectionBlockers,
  );
  if (selectionBlockers.length) {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        selectionBlockers[0]?.message ??
        "The selected setup records are no longer available.",
    });
  }
  const mappings = await createClassroomMappings(
    tx,
    schoolProfileId,
    source,
    preview.target.sessionId,
    selections.classroomIds,
  );
  const result = emptyCounts();
  result.classrooms = mappings.created;
  const selectedSubjectSet = new Set(selections.subjectIds);
  const departmentSubjectMap = new Map<string, string>();
  for (const sourceSubject of source.departmentSubjects) {
    const targetDepartmentId = sourceSubject.classRoomDepartmentId
      ? mappings.departmentMap.get(sourceSubject.classRoomDepartmentId)
      : null;
    if (!targetDepartmentId) {
      if (selectedSubjectSet.has(sourceSubject.id)) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "A selected subject classroom can no longer be mapped. Review the rollover preview again.",
        });
      }
      continue;
    }
    const existingTargetSubject = await tx.departmentSubject.findFirst({
      where: {
        sessionTermId: input.termId,
        classRoomDepartmentId: targetDepartmentId,
        subjectId: sourceSubject.subjectId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!selectedSubjectSet.has(sourceSubject.id)) {
      if (existingTargetSubject) {
        departmentSubjectMap.set(sourceSubject.id, existingTargetSubject.id);
      }
      continue;
    }
    const targetSubject =
      existingTargetSubject ??
      (await tx.departmentSubject.create({
        data: {
          description: sourceSubject.description,
          classRoomDepartmentId: targetDepartmentId,
          sessionTermId: input.termId,
          subjectId: sourceSubject.subjectId,
        },
        select: { id: true },
      }));
    if (!existingTargetSubject) result.subjects += 1;
    departmentSubjectMap.set(sourceSubject.id, targetSubject.id);
    result.assessments += await copyAssessments(
      tx,
      sourceSubject.assessments,
      targetSubject.id,
    );
  }

  if (!preview.promotional) {
    const selectedStudentSet = new Set(selections.studentIds);
    const enrollmentCandidates = new Map<
      string,
      {
        id: string;
        schoolProfileId: string;
        schoolSessionId: string;
        sessionTermId: string;
        studentId: string;
        studentSessionFormId: string;
        classroomDepartmentId: string;
        admissionType: "RETURNING";
      }
    >();
    for (const sourceForm of source.termForms) {
      if (
        !sourceForm.studentId ||
        !selectedStudentSet.has(sourceForm.studentId) ||
        !sourceForm.classroomDepartmentId
      ) {
        continue;
      }
      const targetDepartmentId = mappings.departmentMap.get(
        sourceForm.classroomDepartmentId,
      );
      if (!targetDepartmentId) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "A selected student classroom can no longer be mapped. Review the rollover preview again.",
        });
      }
      enrollmentCandidates.set(sourceForm.studentId, {
        id: randomUUID(),
        schoolProfileId,
        schoolSessionId: preview.target.sessionId,
        sessionTermId: input.termId,
        studentId: sourceForm.studentId,
        studentSessionFormId: sourceForm.studentSessionFormId,
        classroomDepartmentId: targetDepartmentId,
        admissionType: "RETURNING" as const,
      });
    }

    const candidates = [...enrollmentCandidates.values()];
    const existingForms = candidates.length
      ? await tx.studentTermForm.findMany({
          where: {
            schoolProfileId,
            sessionTermId: input.termId,
            studentId: {
              in: candidates.map((candidate) => candidate.studentId),
            },
            deletedAt: null,
          },
          select: { studentId: true },
        })
      : [];
    const existingStudentIds = new Set(
      existingForms
        .map((form: { studentId: string | null }) => form.studentId)
        .filter((studentId: string | null): studentId is string =>
          Boolean(studentId),
        ),
    );
    const newEnrollments = candidates.filter(
      (candidate) => !existingStudentIds.has(candidate.studentId),
    );

    if (newEnrollments.length) {
      const inserted = await tx.studentTermForm.createMany({
        data: newEnrollments,
      });
      result.students = inserted.count;

      const departmentIds = unique(
        newEnrollments.map((enrollment) => enrollment.classroomDepartmentId),
      );
      const feeItems = await tx.financeItem.findMany({
        where: {
          schoolProfileId,
          isActive: true,
          deletedAt: null,
          collectable: true,
          AND: [
            {
              OR: [
                { studentAudience: "ALL_STUDENTS" },
                { studentAudience: "RETURNING_STUDENTS_ONLY" },
              ],
            },
            {
              OR: [
                { schoolSessionId: preview.target.sessionId },
                { schoolSessionId: null },
              ],
            },
            {
              OR: [{ sessionTermId: input.termId }, { sessionTermId: null }],
            },
            {
              OR: [
                { applicableClasses: { none: { deletedAt: null } } },
                {
                  applicableClasses: {
                    some: {
                      classRoomDepartmentId: { in: departmentIds },
                      deletedAt: null,
                    },
                  },
                },
              ],
            },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          amount: true,
          streamId: true,
          collectable: true,
          applicableClasses: {
            where: {
              classRoomDepartmentId: { in: departmentIds },
              deletedAt: null,
            },
            select: { classRoomDepartmentId: true },
          },
        },
      });
      const globalFeeItems = feeItems.filter(
        (item) => item.applicableClasses.length === 0,
      );
      const feeItemsByDepartment = new Map<string, typeof feeItems>();
      for (const feeItem of feeItems) {
        for (const applicability of feeItem.applicableClasses) {
          const departmentItems =
            feeItemsByDepartment.get(applicability.classRoomDepartmentId) ?? [];
          departmentItems.push(feeItem);
          feeItemsByDepartment.set(
            applicability.classRoomDepartmentId,
            departmentItems,
          );
        }
      }
      const chargeRows = newEnrollments.flatMap((enrollment) =>
        [
          ...globalFeeItems,
          ...(feeItemsByDepartment.get(enrollment.classroomDepartmentId) ?? []),
        ].map((item) => ({
            schoolProfileId,
            streamId: item.streamId,
            itemId: item.id,
            payerType: "STUDENT" as const,
            studentId: enrollment.studentId,
            studentTermFormId: enrollment.id,
            classroomDepartmentId: enrollment.classroomDepartmentId,
            schoolSessionId: preview.target.sessionId,
            sessionTermId: input.termId,
            title: item.name,
            description: item.description,
            amount: item.amount,
            collectionStatus: "NOT_COLLECTED" as const,
            assignmentSource: "REQUIRED_AUTO" as const,
          }),
        ),
      );
      if (chargeRows.length) {
        const insertedCharges = await tx.financeCharge.createMany({
          data: chargeRows,
        });
        result.fees = insertedCharges.count;
      }
    }
  }

  const selectedTeacherSet = new Set(selections.teacherIds);
  for (const sourceProfile of source.staffTermProfiles) {
    if (!selectedTeacherSet.has(sourceProfile.staffProfileId)) continue;
    let targetProfile = await tx.staffTermProfile.findFirst({
      where: {
        staffProfileId: sourceProfile.staffProfileId,
        schoolSessionId: preview.target.sessionId,
        sessionTermId: input.termId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!targetProfile) {
      targetProfile = await tx.staffTermProfile.create({
        data: {
          staffProfileId: sourceProfile.staffProfileId,
          schoolSessionId: preview.target.sessionId,
          sessionTermId: input.termId,
        },
        select: { id: true },
      });
      result.teachers += 1;
    }
    for (const classroomProfile of sourceProfile.classroomsProfiles) {
      const targetDepartmentId = classroomProfile.classRoomDepartmentId
        ? mappings.departmentMap.get(classroomProfile.classRoomDepartmentId)
        : null;
      if (!targetDepartmentId) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "A teacher classroom assignment can no longer be mapped. Review the rollover preview again.",
        });
      }
      const existing = await tx.staffClassroomDepartmentTermProfiles.findFirst({
        where: {
          staffTermProfileId: targetProfile.id,
          classRoomDepartmentId: targetDepartmentId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!existing) {
        await tx.staffClassroomDepartmentTermProfiles.create({
          data: {
            staffTermProfileId: targetProfile.id,
            classRoomDepartmentId: targetDepartmentId,
            subjectAccessMode: classroomProfile.subjectAccessMode,
          },
        });
      }
    }
    for (const grant of sourceProfile.academicAccessGrants) {
      const classRoomId = grant.classRoomId
        ? mappings.classMap.get(grant.classRoomId)
        : null;
      const classRoomDepartmentId = grant.classRoomDepartmentId
        ? mappings.departmentMap.get(grant.classRoomDepartmentId)
        : null;
      const departmentSubjectId = grant.departmentSubjectId
        ? departmentSubjectMap.get(grant.departmentSubjectId)
        : null;
      if (
        (grant.classRoomId && !classRoomId) ||
        (grant.classRoomDepartmentId && !classRoomDepartmentId) ||
        (grant.departmentSubjectId && !departmentSubjectId)
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "A teacher academic grant can no longer be mapped. Review the rollover preview again.",
        });
      }
      const grantData = {
        scope: grant.scope,
        classRoomId: classRoomId ?? null,
        classRoomDepartmentId: classRoomDepartmentId ?? null,
        subjectId: grant.subjectId,
        departmentSubjectId: departmentSubjectId ?? null,
        staffTermProfileId: targetProfile.id,
      };
      const existing = await tx.staffAcademicAccessGrant.findFirst({
        where: {
          ...grantData,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!existing) {
        await tx.staffAcademicAccessGrant.create({ data: grantData });
      }
    }
    for (const subject of sourceProfile.staffProfile.subjects) {
      const targetDepartmentSubjectId = subject.departmentSubjectId
        ? departmentSubjectMap.get(subject.departmentSubjectId)
        : null;
      if (!targetDepartmentSubjectId) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "A teacher subject assignment can no longer be mapped. Review the rollover preview again.",
        });
      }
      const existing = await tx.staffSubject.findFirst({
        where: {
          staffProfilesId: sourceProfile.staffProfileId,
          departmentSubjectId: targetDepartmentSubjectId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!existing) {
        await tx.staffSubject.create({
          data: {
            staffProfilesId: sourceProfile.staffProfileId,
            departmentSubjectId: targetDepartmentSubjectId,
          },
        });
      }
    }
  }
  await tx.sessionTerm.update({
    where: { id: input.termId },
    data: {
      lifecycleStatus: "READY",
      setupCompletedAt: new Date(),
    },
  });
  return result;
}

export async function applyAcademicTermSetup(
  ctx: TRPCContext,
  input: AcademicTermSetupApply,
) {
  const { schoolProfileId, user } = await requireAcademicAdmin(ctx);
  const existingRun = await ctx.db.academicTermSetupRun.findUnique({
    where: {
      schoolProfileId_idempotencyKey: {
        schoolProfileId,
        idempotencyKey: input.idempotencyKey,
      },
    },
  });
  if (
    existingRun &&
    setupConfigurationFingerprint(existingRun.configuration) !==
      setupConfigurationFingerprint(input)
  ) {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "This setup confirmation key was already used for different rollover settings.",
    });
  }
  if (existingRun?.status === "COMPLETED") {
    return {
      runId: existingRun.id,
      result: existingRun.result as SetupCounts,
      alreadyApplied: true,
    };
  }
  if (existingRun?.status === "APPLYING") {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This term setup is already being applied.",
    });
  }
  const preview = await buildTermSetupPreview(ctx.db, schoolProfileId, input);
  if (preview.blockers.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: preview.blockers[0]?.message ?? "Term setup cannot continue.",
    });
  }
  const run = existingRun
    ? await ctx.db.academicTermSetupRun.update({
        where: { id: existingRun.id },
        data: {
          status: "APPLYING",
          configuration: input,
          result: undefined,
          errorMessage: null,
          completedAt: null,
        },
      })
    : await ctx.db.academicTermSetupRun.create({
        data: {
          schoolProfileId,
          sourceTermId: preview.source?.id ?? null,
          targetTermId: input.termId,
          idempotencyKey: input.idempotencyKey,
          status: "APPLYING",
          configuration: input,
          createdByUserId: user.id,
        },
      });
  try {
    const result = await ctx.db.$transaction(
      async (tx: AcademicDb) => {
        const transactionTerms = await resolveSetupTerms(
          tx,
          schoolProfileId,
          input.termId,
          input.previousTermId,
        );
        if (
          transactionTerms.target.lifecycleStatus === "ACTIVE" ||
          transactionTerms.target.lifecycleStatus === "CLOSED"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `A ${transactionTerms.target.lifecycleStatus.toLowerCase()} term cannot be configured.`,
          });
        }
        if (
          (transactionTerms.source?.id ?? null) !== (preview.source?.id ?? null)
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "The source academic term changed after preview. Review the setup again.",
          });
        }
        const transactionPreview = {
          ...preview,
          target: transactionTerms.target,
          source: transactionTerms.source
            ? {
                id: transactionTerms.source.id,
                title: transactionTerms.source.title,
                sessionId: transactionTerms.source.sessionId,
                sessionTitle: transactionTerms.source.session.title,
              }
            : null,
          promotional:
            transactionTerms.source !== null &&
            transactionTerms.source.sessionId !==
              transactionTerms.target.sessionId,
        };
        const applied = await applySetupTransaction(
          tx,
          schoolProfileId,
          input,
          transactionPreview,
        );
        await tx.academicTermSetupRun.update({
          where: { id: run.id },
          data: {
            status: "COMPLETED",
            result: applied,
            completedAt: new Date(),
          },
        });
        await tx.activity.create({
          data: {
            schoolProfileId,
            userId: user.id,
            author: user.name,
            source: "user",
            type: "academic_term_setup_completed",
            title: "Academic term setup completed",
            description: `${transactionPreview.target.title} is ready for activation.`,
            meta: {
              runId: run.id,
              sourceTermId: transactionPreview.source?.id ?? null,
              targetTermId: input.termId,
              result: applied,
            },
          },
        });
        return applied;
      },
      { isolationLevel: "Serializable", maxWait: 5_000, timeout: 50_000 },
    );
    return { runId: run.id, result, alreadyApplied: false };
  } catch (error) {
    await ctx.db.academicTermSetupRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        errorMessage:
          error instanceof Error ? error.message : "Term setup failed.",
      },
    });
    throw error;
  }
}

export async function createAcademicTermDraft(
  ctx: TRPCContext,
  input: CreateAcademicTermDraft,
) {
  const { schoolProfileId } = await requireAcademicAdmin(ctx);
  const session = await ctx.db.schoolSession.findFirst({
    where: {
      id: input.sessionId,
      schoolId: schoolProfileId,
      deletedAt: null,
    },
    select: { id: true, title: true },
  });
  if (!session) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "The selected academic session was not found.",
    });
  }
  const existing = await ctx.db.sessionTerm.findFirst({
    where: {
      schoolId: schoolProfileId,
      sessionId: session.id,
      deletedAt: null,
      title: { equals: input.title, mode: "insensitive" },
    },
    select: { id: true, title: true },
  });
  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "A term with this title already exists in the selected session.",
    });
  }
  return ctx.db.sessionTerm.create({
    data: {
      schoolId: schoolProfileId,
      sessionId: session.id,
      title: input.title,
      startDate: input.startDate,
      endDate: input.endDate,
      note: input.note || null,
      lifecycleStatus: "DRAFT",
    },
    select: {
      id: true,
      title: true,
      sessionId: true,
      session: { select: { title: true } },
    },
  });
}

function findDateCurrentTerm<
  T extends { startDate: Date | null; endDate: Date | null },
>(terms: T[], now = new Date()) {
  return (
    [...terms]
      .filter(
        (term) =>
          term.startDate &&
          term.startDate <= now &&
          (!term.endDate || term.endDate >= now),
      )
      .sort(
        (left, right) =>
          (right.startDate?.getTime() ?? 0) - (left.startDate?.getTime() ?? 0),
      )[0] ?? null
  );
}

export async function previewAcademicTermActivation(
  ctx: TRPCContext,
  input: { termId: string },
) {
  const { schoolProfileId, activeSessionTermId } =
    await requireAcademicAdmin(ctx);
  const terms = await getTenantTerms(ctx.db, schoolProfileId);
  const target = terms.find((term) => term.id === input.termId);
  if (!target) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Academic term was not found.",
    });
  }
  const active =
    terms.find((term) => term.id === activeSessionTermId) ??
    findDateCurrentTerm(
      terms.filter(
        (term) =>
          term.id !== target.id &&
          (term.lifecycleStatus === null || term.lifecycleStatus === "ACTIVE"),
      ),
    );
  const blockers: { key: string; message: string }[] = [];
  if (!target.setupCompletedAt || target.lifecycleStatus !== "READY") {
    blockers.push({
      key: "setup-not-complete",
      message: "Complete the term setup before activation.",
    });
  }
  if (!target.startDate) {
    blockers.push({
      key: "missing-start-date",
      message: "Set the term start date before activation.",
    });
  }
  if (
    target.startDate &&
    target.endDate &&
    target.endDate.getTime() < target.startDate.getTime()
  ) {
    blockers.push({
      key: "invalid-dates",
      message: "The term end date must be on or after its start date.",
    });
  }
  if (active && active.id !== target.id) {
    const financeClose = await ctx.db.financeTermLedgerClose.findFirst({
      where: {
        schoolProfileId,
        sessionTermId: active.id,
        status: "CLOSED",
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!financeClose) {
      blockers.push({
        key: "finance-ledger-open",
        message: `Close the finance ledger for ${active.title} before activation.`,
      });
    }
  }
  const completedRun = await ctx.db.academicTermSetupRun.findFirst({
    where: {
      schoolProfileId,
      targetTermId: target.id,
      status: "COMPLETED",
    },
    orderBy: { completedAt: "desc" },
    select: {
      sourceTermId: true,
      sourceTerm: { select: { sessionId: true } },
    },
  });
  if (
    completedRun?.sourceTermId &&
    completedRun.sourceTerm?.sessionId !== target.sessionId
  ) {
    const [sourceStudents, targetStudents] = await Promise.all([
      ctx.db.studentTermForm.count({
        where: {
          sessionTermId: completedRun.sourceTermId,
          deletedAt: null,
        },
      }),
      ctx.db.studentTermForm.count({
        where: {
          sessionTermId: target.id,
          deletedAt: null,
        },
      }),
    ]);
    if (sourceStudents > 0 && targetStudents === 0) {
      blockers.push({
        key: "progression-pending",
        message:
          "Progress students into the new session before activating this term.",
      });
    }
  }
  return {
    target,
    currentActiveTerm: active
      ? {
          id: active.id,
          title: active.title,
          sessionId: active.sessionId,
          sessionTitle: active.session.title,
        }
      : null,
    blockers,
    canActivate: blockers.length === 0,
  };
}

export async function activateAcademicTerm(
  ctx: TRPCContext,
  input: { termId: string },
) {
  return ctx.db.$transaction(
    async (tx: AcademicDb) => {
      const transactionContext = { ...ctx, db: tx } as TRPCContext;
      const { schoolProfileId, activeSessionTermId, user } =
        await requireAcademicAdmin(transactionContext);
      const existingActive = await tx.sessionTerm.findFirst({
        where: {
          id: input.termId,
          schoolId: schoolProfileId,
          deletedAt: null,
          lifecycleStatus: "ACTIVE",
        },
        select: {
          id: true,
          title: true,
          sessionId: true,
          session: { select: { title: true } },
        },
      });
      if (existingActive && activeSessionTermId === existingActive.id) {
        return {
          termId: existingActive.id,
          termTitle: existingActive.title,
          sessionId: existingActive.sessionId,
          sessionTitle: existingActive.session.title,
        };
      }
      const preview = await previewAcademicTermActivation(
        transactionContext,
        input,
      );
      if (preview.blockers.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: preview.blockers[0]?.message ?? "Term cannot be activated.",
        });
      }
      if (
        preview.currentActiveTerm &&
        preview.currentActiveTerm.id !== input.termId
      ) {
        await tx.sessionTerm.update({
          where: { id: preview.currentActiveTerm.id },
          data: {
            lifecycleStatus: "CLOSED",
            closedAt: new Date(),
            closedByUserId: user.id,
          },
        });
      }
      const target = await tx.sessionTerm.update({
        where: { id: input.termId },
        data: {
          lifecycleStatus: "ACTIVE",
          activatedAt: new Date(),
          activatedByUserId: user.id,
          closedAt: null,
          closedByUserId: null,
        },
        select: {
          id: true,
          title: true,
          sessionId: true,
          session: { select: { title: true } },
        },
      });
      await tx.schoolProfile.update({
        where: { id: schoolProfileId },
        data: { activeSessionTermId: target.id },
      });
      await tx.activity.create({
        data: {
          schoolProfileId,
          userId: user.id,
          author: user.name,
          source: "user",
          type: "academic_term_activated",
          title: "Academic term activated",
          description: `${target.title} is now the active academic term.`,
          meta: {
            targetTermId: target.id,
            previousTermId: preview.currentActiveTerm?.id ?? null,
          },
        },
      });
      return {
        termId: target.id,
        termTitle: target.title,
        sessionId: target.sessionId,
        sessionTitle: target.session?.title ?? "",
      };
    },
    { isolationLevel: "Serializable" },
  );
}

export async function closeAcademicTerm(
  ctx: TRPCContext,
  input: { termId: string },
) {
  return ctx.db.$transaction(async (tx: AcademicDb) => {
    const transactionContext = { ...ctx, db: tx } as TRPCContext;
    const { schoolProfileId, user, activeSessionTermId } =
      await requireAcademicAdmin(transactionContext);
    const term = await tx.sessionTerm.findFirst({
      where: {
        id: input.termId,
        schoolId: schoolProfileId,
        deletedAt: null,
      },
      select: { id: true, title: true, lifecycleStatus: true },
    });
    if (!term) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Academic term was not found.",
      });
    }
    if (term.lifecycleStatus !== "ACTIVE" && activeSessionTermId !== term.id) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Only the active term can be closed.",
      });
    }
    const financeClose = await tx.financeTermLedgerClose.findFirst({
      where: {
        schoolProfileId,
        sessionTermId: term.id,
        status: "CLOSED",
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!financeClose) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Close the term finance ledger before closing the academic term.",
      });
    }
    await tx.sessionTerm.update({
      where: { id: term.id },
      data: {
        lifecycleStatus: "CLOSED",
        closedAt: new Date(),
        closedByUserId: user.id,
      },
    });
    if (activeSessionTermId === term.id) {
      await tx.schoolProfile.update({
        where: { id: schoolProfileId },
        data: { activeSessionTermId: null },
      });
    }
    await tx.activity.create({
      data: {
        schoolProfileId,
        userId: user.id,
        author: user.name,
        source: "user",
        type: "academic_term_closed",
        title: "Academic term closed",
        description: `${term.title} was closed.`,
        meta: { termId: term.id },
      },
    });
    return { success: true };
  });
}
