import { describe, expect, test } from "bun:test";

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@127.0.0.1:55432/school_clerk";

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

function createPrintHistoryContext({
  termForms = [
    {
      id: "term-form-1",
      classroomDepartmentId: "classroom-1",
    },
  ],
  logs = [],
}: {
  termForms?: Array<{
    id: string;
    classroomDepartmentId: string | null;
  }>;
  logs?: Array<{
    printedAt: Date;
    termFormIds: string[];
  }>;
} = {}) {
  const termFormQueries: unknown[] = [];
  const printLogQueries: unknown[] = [];
  const createdPrintLogs: unknown[] = [];

  return {
    termFormQueries,
    printLogQueries,
    createdPrintLogs,
    context: {
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
              email: "admin@school.test",
              id: "user-1",
              name: "Admin One",
              role: "Admin",
              saasAccountId: "account-1",
            },
          }),
        },
        studentTermForm: {
          findMany: async (query: unknown) => {
            termFormQueries.push(query);
            return termForms;
          },
        },
        reportPrintLog: {
          create: async (query: unknown) => {
            createdPrintLogs.push(query);
            return { id: "print-log-1" };
          },
          findMany: async (query: unknown) => {
            printLogQueries.push(query);
            return logs;
          },
        },
      },
    },
  };
}

describe("assessment report print history", () => {
  test("validates tenant and term ownership and derives departments", async () => {
    const testContext = createPrintHistoryContext();
    const caller = assessmentRouter.createCaller(testContext.context as any);

    await caller.savePrintLog({
      termId: "term-1",
      termFormIds: ["term-form-1"],
    });

    expect(testContext.termFormQueries[0]).toMatchObject({
      where: {
        id: { in: ["term-form-1"] },
        schoolProfileId: "school-1",
        sessionTermId: "term-1",
        deletedAt: null,
      },
    });
    expect(testContext.createdPrintLogs[0]).toEqual({
      data: {
        schoolProfileId: "school-1",
        termId: "term-1",
        termFormIds: ["term-form-1"],
        departmentIds: ["classroom-1"],
      },
    });
  });

  test("rejects a selected term form from another tenant", async () => {
    const testContext = createPrintHistoryContext({ termForms: [] });
    const caller = assessmentRouter.createCaller(testContext.context as any);

    await expect(
      caller.savePrintLog({
        termId: "term-1",
        termFormIds: ["other-school-term-form"],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(testContext.createdPrintLogs).toHaveLength(0);
  });

  test("rejects a selected term form from another term", async () => {
    const testContext = createPrintHistoryContext({ termForms: [] });
    const caller = assessmentRouter.createCaller(testContext.context as any);

    await expect(
      caller.savePrintLog({
        termId: "term-2",
        termFormIds: ["term-form-1"],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(testContext.termFormQueries[0]).toMatchObject({
      where: {
        schoolProfileId: "school-1",
        sessionTermId: "term-2",
      },
    });
    expect(testContext.createdPrintLogs).toHaveLength(0);
  });

  test("keeps repeated confirmed prints as separate history batches", async () => {
    const testContext = createPrintHistoryContext();
    const caller = assessmentRouter.createCaller(testContext.context as any);
    const input = {
      termId: "term-1",
      termFormIds: ["term-form-1"],
    };

    await caller.savePrintLog(input);
    await caller.savePrintLog(input);

    expect(testContext.createdPrintLogs).toHaveLength(2);
  });

  test("returns latest print dates from tenant- and term-scoped logs", async () => {
    const older = new Date("2026-07-24T08:00:00.000Z");
    const latest = new Date("2026-07-25T08:00:00.000Z");
    const testContext = createPrintHistoryContext({
      logs: [
        { printedAt: older, termFormIds: ["term-form-1"] },
        { printedAt: latest, termFormIds: ["term-form-1"] },
      ],
    });
    const caller = assessmentRouter.createCaller(testContext.context as any);

    const result = await caller.getPrintStatus({
      termId: "term-1",
      termFormIds: ["term-form-1"],
    });

    expect(result).toEqual({ "term-form-1": latest });
    expect(testContext.printLogQueries[0]).toMatchObject({
      where: {
        schoolProfileId: "school-1",
        termId: "term-1",
        termFormIds: { hasSome: ["term-form-1"] },
      },
    });
  });
});
