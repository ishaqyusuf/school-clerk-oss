import { describe, expect, test } from "bun:test";
import { TRPCError } from "@trpc/server";

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@127.0.0.1:55432/school_clerk";

const {
  assertTeacherCanAccessAssessment,
  assertTeacherCanAccessClassroomDepartment,
  assertTeacherCanAccessDepartmentSubject,
} = await import("./teacher-authorization");

type MockCtxOptions = {
  role?: string | null;
  staffProfileExists?: boolean;
  grants?: Array<{
    scope: "CLASS" | "DEPARTMENT" | "CLASS_SUBJECT" | "DEPARTMENT_SUBJECT";
    classRoomId?: string | null;
    classRoomDepartmentId?: string | null;
    subjectId?: string | null;
    departmentSubjectId?: string | null;
  }>;
  departments?: Array<{ id: string; classRoomsId: string }>;
  departmentSubjects?: Array<{
    id: string;
    classRoomDepartmentId: string;
    subjectId: string;
    sessionTermId?: string;
  }>;
  assessments?: Array<{
    id: number;
    departmentSubjectId: string;
    sessionTermId?: string;
  }>;
};

function createMockCtx(options: MockCtxOptions) {
  const role = options.role ?? "Teacher";
  const departmentSubjects = options.departmentSubjects ?? [];

  const ctx = {
    profile: {
      authSessionId: "session-1",
      schoolId: "school-1",
      sessionId: "session-1",
      termId: "term-1",
    },
    db: {
      session: {
        findFirst: async () => ({
          user: {
            email: "teacher@school.test",
            id: "user-1",
            name: "Teacher One",
            role,
          },
        }),
      },
      schoolProfile: {
        findFirst: async () => ({
          accountId: "account-1",
          id: "school-1",
          name: "School",
          subDomain: "school",
        }),
      },
      staffProfile: {
        findFirst: async () =>
          options.staffProfileExists === false
            ? null
            : {
                id: "staff-1",
              },
      },
      staffTermProfile: {
        findFirst: async () => ({
          id: "staff-term-1",
          academicAccessGrants: options.grants ?? [],
          classroomsProfiles: [],
        }),
      },
      staffSubject: {
        findMany: async () => [],
      },
      sessionTerm: {
        findFirst: async () => ({ sessionId: "session-1" }),
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
        findFirst: async (query: any) => {
          const id = query.where.id as string | undefined;
          const sessionTermId = query.where.sessionTermId as string | undefined;
          const subject = departmentSubjects.find(
            (item) =>
              item.id === id &&
              (!sessionTermId ||
                (item.sessionTermId ?? "term-1") === sessionTermId),
          );
          return subject
            ? {
                classRoomDepartmentId: subject.classRoomDepartmentId,
                sessionTermId: subject.sessionTermId ?? "term-1",
              }
            : null;
        },
        findMany: async (query: any) => {
          const ids = query.where.id?.in as string[] | undefined;
          const departmentIds = query.where.classRoomDepartmentId?.in as
            | string[]
            | undefined;
          const classSubjectFilters = query.where.OR as
            | Array<{
                subjectId: string;
                classRoomDepartment: { classRoomsId: string };
              }>
            | undefined;

          return departmentSubjects
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
      classroomSubjectAssessment: {
        findFirst: async (query: any) => {
          const id = query.where.id as number | undefined;
          const assessment = options.assessments?.find(
            (item) => item.id === id,
          );
          return assessment
            ? {
                departmentSubjectId: assessment.departmentSubjectId,
                departmentSubject: {
                  sessionTermId: assessment.sessionTermId ?? "term-1",
                },
              }
            : null;
        },
      },
    },
  };

  return ctx as any;
}

async function expectForbidden(promise: Promise<unknown>, message: string) {
  try {
    await promise;
    throw new Error("Expected authorization to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(TRPCError);
    expect((error as TRPCError).code).toBe("FORBIDDEN");
    expect((error as TRPCError).message).toBe(message);
  }
}

describe("teacher authorization", () => {
  test("allows classroom access through a whole-class grant", async () => {
    const ctx = createMockCtx({
      grants: [{ scope: "CLASS", classRoomId: "class-1" }],
      departments: [
        { id: "department-1", classRoomsId: "class-1" },
        { id: "department-2", classRoomsId: "class-2" },
      ],
      departmentSubjects: [
        {
          id: "department-1-math",
          classRoomDepartmentId: "department-1",
          subjectId: "math",
        },
      ],
    });

    await expect(
      assertTeacherCanAccessClassroomDepartment(ctx, "department-1"),
    ).resolves.toBeUndefined();
  });

  test("rejects classroom access outside effective broad grants", async () => {
    const ctx = createMockCtx({
      grants: [{ scope: "CLASS", classRoomId: "class-1" }],
      departments: [{ id: "department-1", classRoomsId: "class-1" }],
    });

    await expectForbidden(
      assertTeacherCanAccessClassroomDepartment(ctx, "department-2"),
      "This classroom is not assigned to your teacher profile.",
    );
  });

  test("allows department subject access through a class-subject grant", async () => {
    const ctx = createMockCtx({
      grants: [
        { scope: "CLASS_SUBJECT", classRoomId: "class-1", subjectId: "math" },
      ],
      departments: [
        { id: "science", classRoomsId: "class-1" },
        { id: "art", classRoomsId: "class-1" },
      ],
      departmentSubjects: [
        {
          id: "science-math",
          classRoomDepartmentId: "science",
          subjectId: "math",
        },
        {
          id: "art-english",
          classRoomDepartmentId: "art",
          subjectId: "english",
        },
      ],
    });

    await expect(
      assertTeacherCanAccessDepartmentSubject(ctx, "science-math"),
    ).resolves.toBeUndefined();
  });

  test("rejects department subject access outside effective grants", async () => {
    const ctx = createMockCtx({
      grants: [
        { scope: "CLASS_SUBJECT", classRoomId: "class-1", subjectId: "math" },
      ],
      departments: [{ id: "science", classRoomsId: "class-1" }],
      departmentSubjects: [
        {
          id: "science-english",
          classRoomDepartmentId: "science",
          subjectId: "english",
        },
      ],
    });

    await expectForbidden(
      assertTeacherCanAccessDepartmentSubject(ctx, "science-english"),
      "This subject is not assigned to your teacher profile.",
    );
  });

  test("allows assessment access through its department subject grant", async () => {
    const ctx = createMockCtx({
      grants: [
        {
          scope: "DEPARTMENT_SUBJECT",
          classRoomDepartmentId: "science",
          departmentSubjectId: "science-math",
        },
      ],
      departments: [{ id: "science", classRoomsId: "class-1" }],
      departmentSubjects: [
        {
          id: "science-math",
          classRoomDepartmentId: "science",
          subjectId: "math",
        },
      ],
      assessments: [{ id: 1, departmentSubjectId: "science-math" }],
    });

    await expect(
      assertTeacherCanAccessAssessment(ctx, 1),
    ).resolves.toBeUndefined();
  });

  test("does not restrict non-teacher users", async () => {
    const ctx = createMockCtx({
      role: "Admin",
      departmentSubjects: [
        {
          id: "department-subject-1",
          classRoomDepartmentId: "department-1",
          subjectId: "math",
        },
      ],
    });

    await expect(
      assertTeacherCanAccessClassroomDepartment(ctx, "department-1"),
    ).resolves.toBeUndefined();
    await expect(
      assertTeacherCanAccessDepartmentSubject(ctx, "department-subject-1"),
    ).resolves.toBeUndefined();
  });
});
