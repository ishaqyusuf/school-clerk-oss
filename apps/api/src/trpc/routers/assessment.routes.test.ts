import { describe, expect, test } from "bun:test";

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@127.0.0.1:55432/school_clerk";
process.env.POSTGRES_URL ??= process.env.DATABASE_URL;

const { assessmentRouter } = await import("./assessment.routes");

function createRecordingContextOptionsCtx() {
  const departments = [
    {
      id: "science",
      classRoomsId: "class-1",
      departmentName: "Science",
      departmentLevel: 1,
      classRoom: {
        id: "class-1",
        name: "SS 1",
        classLevel: 1,
      },
    },
    {
      id: "art",
      classRoomsId: "class-1",
      departmentName: "Art",
      departmentLevel: 2,
      classRoom: {
        id: "class-1",
        name: "SS 1",
        classLevel: 1,
      },
    },
  ];
  const departmentSubjects = [
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
  ];

  return {
    profile: {
      authSessionId: "session-token",
      schoolId: "school-1",
      sessionId: "session-1",
      termId: "term-1",
    },
    db: {
      session: {
        findFirst: async () => ({
          id: "session-token",
          token: "session-token",
          user: {
            email: "teacher@school.test",
            id: "user-1",
            name: "Teacher One",
            role: "Teacher",
            saasAccountId: "account-1",
          },
        }),
      },
      staffProfile: {
        findFirst: async () => ({ id: "staff-1" }),
      },
      staffTermProfile: {
        findMany: async () => [
          {
            id: "staff-term-1",
            sessionTerm: {
              id: "term-1",
              title: "First Term",
              startDate: new Date("2026-01-01T00:00:00.000Z"),
              endDate: null,
              session: {
                id: "session-1",
                title: "2026/2027",
              },
            },
          },
        ],
        findFirst: async () => ({
          id: "staff-term-1",
          academicAccessGrants: [
            {
              scope: "CLASS_SUBJECT",
              classRoomId: "class-1",
              subjectId: "math",
            },
          ],
          classroomsProfiles: [],
        }),
      },
      staffSubject: {
        findMany: async () => [],
      },
      classRoomDepartment: {
        findMany: async (query: any) => {
          const ids = query.where.id?.in as string[] | undefined;
          const classIds = query.where.classRoomsId?.in as string[] | undefined;

          return departments
            .filter((department) => (ids ? ids.includes(department.id) : true))
            .filter((department) =>
              classIds ? classIds.includes(department.classRoomsId) : true,
            )
            .map((department) => {
              if (query.select?.departmentName) {
                return {
                  id: department.id,
                  departmentName: department.departmentName,
                  departmentLevel: department.departmentLevel,
                  classRoom: department.classRoom,
                };
              }

              return { id: department.id };
            });
        },
      },
      departmentSubject: {
        findMany: async (query: any) => {
          const classSubjectFilters = query.where.OR as
            | Array<{
                subjectId: string;
                classRoomDepartment: { classRoomsId: string };
              }>
            | undefined;

          return departmentSubjects
            .filter((subject) => {
              if (!classSubjectFilters?.length) return true;
              return classSubjectFilters.some((filter) => {
                const department = departments.find(
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
    },
  };
}

describe("assessment recording context teacher access", () => {
  test("scopes teacher classroom options to broad class-subject grants", async () => {
    const caller = assessmentRouter.createCaller(
      createRecordingContextOptionsCtx() as any,
    );

    const result = await caller.getRecordingContextOptions({
      termId: "term-1",
    });

    expect(result.scoped).toBe(true);
    expect(result.defaultTermId).toBe("term-1");
    expect(result.defaultDepartmentId).toBe("science");
    expect(result.classrooms.map((classroom) => classroom.id)).toEqual([
      "science",
    ]);
    expect(result.classrooms.map((classroom) => classroom.displayName)).toEqual([
      "SS 1 Science",
    ]);
  });
});
