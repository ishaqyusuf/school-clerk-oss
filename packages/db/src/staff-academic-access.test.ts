// @ts-expect-error Bun test types are not included by this package tsconfig.
import { describe, expect, test } from "bun:test";
import { resolveStaffAcademicAccess } from "./staff-academic-access";

type MockDbOptions = {
  hasStaffTermProfile?: boolean;
  grants?: Array<{
    scope: "CLASS" | "DEPARTMENT" | "CLASS_SUBJECT" | "DEPARTMENT_SUBJECT";
    classRoomId?: string | null;
    classRoomDepartmentId?: string | null;
    subjectId?: string | null;
    departmentSubjectId?: string | null;
  }>;
  legacyClassrooms?: Array<{
    classRoomDepartmentId: string;
    subjectAccessMode: "SELECTED" | "ALL";
  }>;
  legacySubjects?: Array<{
    departmentSubjectId: string;
    classRoomDepartmentId: string;
  }>;
  departments?: Array<{ id: string; classRoomsId: string }>;
  departmentSubjects?: Array<{
    id: string;
    classRoomDepartmentId: string;
    subjectId: string;
  }>;
};

function createMockDb(options: MockDbOptions) {
  const db = {
    staffTermProfile: {
      findFirst: async () =>
        options.hasStaffTermProfile === false
          ? null
          : {
              id: "staff-term-1",
              academicAccessGrants: options.grants ?? [],
              classroomsProfiles: options.legacyClassrooms ?? [],
            },
    },
    staffSubject: {
      findMany: async () =>
        (options.legacySubjects ?? []).map((subject) => ({
          departmentSubjectId: subject.departmentSubjectId,
          departmentSubject: {
            classRoomDepartmentId: subject.classRoomDepartmentId,
          },
        })),
    },
    classRoomDepartment: {
      findMany: async (query: any) => {
        const classIds = query.where.classRoomsId?.in as string[] | undefined;
        const ids = query.where.id?.in as string[] | undefined;
        return (options.departments ?? [])
          .filter((department) => (ids ? ids.includes(department.id) : true))
          .filter((department) =>
            classIds ? classIds.includes(department.classRoomsId) : true,
          )
          .map((department) => ({ id: department.id }));
      },
    },
    departmentSubject: {
      findMany: async (query: any) => {
        const ids = query.where.id?.in as string[] | undefined;
        const departmentIds = query.where.classRoomDepartmentId?.in as
          | string[]
          | undefined;
        const classSubjectFilters = query.where.OR as
          | Array<{ subjectId: string; classRoomDepartment: { classRoomsId: string } }>
          | undefined;

        return (options.departmentSubjects ?? [])
          .filter((subject) => (ids ? ids.includes(subject.id) : true))
          .filter((subject) =>
            departmentIds
              ? departmentIds.includes(subject.classRoomDepartmentId)
              : true,
          )
          .filter((subject) => {
            if (!classSubjectFilters?.length) return true;
            return classSubjectFilters.some((filter) => {
              const department = options.departments?.find(
                (item) => item.id === subject.classRoomDepartmentId,
              );
              return (
                subject.subjectId === filter.subjectId &&
                department?.classRoomsId ===
                  filter.classRoomDepartment.classRoomsId
              );
            });
          })
          .map((subject) => ({
            id: subject.id,
            classRoomDepartmentId: subject.classRoomDepartmentId,
          }));
      },
    },
  };

  return db as any;
}

const resolverInput = {
  staffProfileId: "staff-1",
  schoolProfileId: "school-1",
  schoolSessionId: "session-1",
  sessionTermId: "term-1",
};

describe("resolveStaffAcademicAccess", () => {
  test("resolves whole-class grants to all current departments and subjects", async () => {
    const access = await resolveStaffAcademicAccess({
      ...resolverInput,
      db: createMockDb({
        grants: [{ scope: "CLASS", classRoomId: "class-1" }],
        departments: [
          { id: "art", classRoomsId: "class-1" },
          { id: "science", classRoomsId: "class-1" },
          { id: "ss2", classRoomsId: "class-2" },
        ],
        departmentSubjects: [
          { id: "art-math", classRoomDepartmentId: "art", subjectId: "math" },
          {
            id: "science-english",
            classRoomDepartmentId: "science",
            subjectId: "english",
          },
          { id: "ss2-math", classRoomDepartmentId: "ss2", subjectId: "math" },
        ],
      }),
    });

    expect(access.classRoomDepartmentIds.sort()).toEqual(["art", "science"]);
    expect(access.departmentSubjectIds.sort()).toEqual([
      "art-math",
      "science-english",
    ]);
  });

  test("resolves subject-across-class grants only where the subject is offered", async () => {
    const access = await resolveStaffAcademicAccess({
      ...resolverInput,
      db: createMockDb({
        grants: [
          { scope: "CLASS_SUBJECT", classRoomId: "class-1", subjectId: "math" },
        ],
        departments: [
          { id: "art", classRoomsId: "class-1" },
          { id: "science", classRoomsId: "class-1" },
          { id: "ss2", classRoomsId: "class-2" },
        ],
        departmentSubjects: [
          { id: "art-math", classRoomDepartmentId: "art", subjectId: "math" },
          {
            id: "science-english",
            classRoomDepartmentId: "science",
            subjectId: "english",
          },
          { id: "ss2-math", classRoomDepartmentId: "ss2", subjectId: "math" },
        ],
      }),
    });

    expect(access.classRoomDepartmentIds).toEqual(["art"]);
    expect(access.departmentSubjectIds).toEqual(["art-math"]);
  });

  test("combines legacy selected and all-subject department assignments", async () => {
    const access = await resolveStaffAcademicAccess({
      ...resolverInput,
      db: createMockDb({
        legacyClassrooms: [
          { classRoomDepartmentId: "art", subjectAccessMode: "SELECTED" },
          { classRoomDepartmentId: "science", subjectAccessMode: "ALL" },
        ],
        legacySubjects: [
          { departmentSubjectId: "art-math", classRoomDepartmentId: "art" },
        ],
        departments: [
          { id: "art", classRoomsId: "class-1" },
          { id: "science", classRoomsId: "class-1" },
        ],
        departmentSubjects: [
          { id: "art-math", classRoomDepartmentId: "art", subjectId: "math" },
          {
            id: "science-english",
            classRoomDepartmentId: "science",
            subjectId: "english",
          },
        ],
      }),
    });

    expect(access.classRoomDepartmentIds.sort()).toEqual(["art", "science"]);
    expect(access.departmentSubjectIds.sort()).toEqual([
      "art-math",
      "science-english",
    ]);
  });

  test("resolves department grants to one department and all active subjects in it", async () => {
    const access = await resolveStaffAcademicAccess({
      ...resolverInput,
      db: createMockDb({
        grants: [{ scope: "DEPARTMENT", classRoomDepartmentId: "art" }],
        departments: [
          { id: "art", classRoomsId: "class-1" },
          { id: "science", classRoomsId: "class-1" },
        ],
        departmentSubjects: [
          { id: "art-math", classRoomDepartmentId: "art", subjectId: "math" },
          {
            id: "art-english",
            classRoomDepartmentId: "art",
            subjectId: "english",
          },
          {
            id: "science-math",
            classRoomDepartmentId: "science",
            subjectId: "math",
          },
        ],
      }),
    });

    expect(access.classRoomDepartmentIds).toEqual(["art"]);
    expect(access.departmentSubjectIds.sort()).toEqual([
      "art-english",
      "art-math",
    ]);
  });

  test("resolves department-subject grants to only the selected subject offering", async () => {
    const access = await resolveStaffAcademicAccess({
      ...resolverInput,
      db: createMockDb({
        grants: [
          {
            scope: "DEPARTMENT_SUBJECT",
            classRoomDepartmentId: "art",
            departmentSubjectId: "art-math",
          },
        ],
        departments: [{ id: "art", classRoomsId: "class-1" }],
        departmentSubjects: [
          { id: "art-math", classRoomDepartmentId: "art", subjectId: "math" },
          {
            id: "art-english",
            classRoomDepartmentId: "art",
            subjectId: "english",
          },
        ],
      }),
    });

    expect(access.classRoomDepartmentIds).toEqual(["art"]);
    expect(access.departmentSubjectIds).toEqual(["art-math"]);
  });

  test("deduplicates overlapping broad and narrow grants", async () => {
    const access = await resolveStaffAcademicAccess({
      ...resolverInput,
      db: createMockDb({
        grants: [
          { scope: "CLASS", classRoomId: "class-1" },
          { scope: "DEPARTMENT", classRoomDepartmentId: "art" },
          {
            scope: "DEPARTMENT_SUBJECT",
            classRoomDepartmentId: "art",
            departmentSubjectId: "art-math",
          },
        ],
        departments: [
          { id: "art", classRoomsId: "class-1" },
          { id: "science", classRoomsId: "class-1" },
        ],
        departmentSubjects: [
          { id: "art-math", classRoomDepartmentId: "art", subjectId: "math" },
          {
            id: "science-math",
            classRoomDepartmentId: "science",
            subjectId: "math",
          },
        ],
      }),
    });

    expect(access.classRoomDepartmentIds.sort()).toEqual(["art", "science"]);
    expect(access.departmentSubjectIds.sort()).toEqual([
      "art-math",
      "science-math",
    ]);
  });

  test("ignores stale department references that fail active scope validation", async () => {
    const access = await resolveStaffAcademicAccess({
      ...resolverInput,
      db: createMockDb({
        grants: [{ scope: "DEPARTMENT", classRoomDepartmentId: "stale" }],
        legacyClassrooms: [
          { classRoomDepartmentId: "stale", subjectAccessMode: "ALL" },
        ],
        departments: [{ id: "art", classRoomsId: "class-1" }],
        departmentSubjects: [
          { id: "stale-math", classRoomDepartmentId: "stale", subjectId: "math" },
        ],
      }),
    });

    expect(access.classRoomDepartmentIds).toEqual([]);
    expect(access.departmentSubjectIds).toEqual([]);
  });

  test("returns empty access when no active staff term profile exists", async () => {
    const access = await resolveStaffAcademicAccess({
      ...resolverInput,
      db: createMockDb({
        hasStaffTermProfile: false,
        grants: [{ scope: "CLASS", classRoomId: "class-1" }],
      }),
    });

    expect(access).toEqual({
      classRoomDepartmentIds: [],
      departmentSubjectIds: [],
    });
  });

  test("picks up future departments and subjects covered by a whole-class grant", async () => {
    const options: MockDbOptions = {
      grants: [{ scope: "CLASS", classRoomId: "class-1" }],
      departments: [{ id: "art", classRoomsId: "class-1" }],
      departmentSubjects: [
        { id: "art-math", classRoomDepartmentId: "art", subjectId: "math" },
      ],
    };
    const db = createMockDb(options);

    const before = await resolveStaffAcademicAccess({
      ...resolverInput,
      db,
    });
    expect(before.classRoomDepartmentIds).toEqual(["art"]);
    expect(before.departmentSubjectIds).toEqual(["art-math"]);

    options.departments!.push({ id: "science", classRoomsId: "class-1" });
    options.departmentSubjects!.push({
      id: "science-biology",
      classRoomDepartmentId: "science",
      subjectId: "biology",
    });

    const after = await resolveStaffAcademicAccess({
      ...resolverInput,
      db,
    });
    expect(after.classRoomDepartmentIds.sort()).toEqual(["art", "science"]);
    expect(after.departmentSubjectIds.sort()).toEqual([
      "art-math",
      "science-biology",
    ]);
  });

  test("picks up future subject offerings covered by a subject-across-class grant", async () => {
    const options: MockDbOptions = {
      grants: [
        { scope: "CLASS_SUBJECT", classRoomId: "class-1", subjectId: "math" },
      ],
      departments: [
        { id: "art", classRoomsId: "class-1" },
        { id: "science", classRoomsId: "class-1" },
      ],
      departmentSubjects: [
        { id: "art-math", classRoomDepartmentId: "art", subjectId: "math" },
      ],
    };
    const db = createMockDb(options);

    const before = await resolveStaffAcademicAccess({
      ...resolverInput,
      db,
    });
    expect(before.classRoomDepartmentIds).toEqual(["art"]);
    expect(before.departmentSubjectIds).toEqual(["art-math"]);

    options.departmentSubjects!.push({
      id: "science-math",
      classRoomDepartmentId: "science",
      subjectId: "math",
    });

    const after = await resolveStaffAcademicAccess({
      ...resolverInput,
      db,
    });
    expect(after.classRoomDepartmentIds.sort()).toEqual(["art", "science"]);
    expect(after.departmentSubjectIds.sort()).toEqual([
      "art-math",
      "science-math",
    ]);
  });
});
