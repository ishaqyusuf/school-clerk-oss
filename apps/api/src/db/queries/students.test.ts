import { describe, expect, test } from "bun:test";
import { TRPCError } from "@trpc/server";

process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";
process.env.POSTGRES_URL ??= process.env.DATABASE_URL;

const {
  changeStudentGender,
  executeStudentImport,
  getStudents,
  verifyStudentImport,
} = await import("./students");
const { getStudentDuplicateGroups, previewStudentDuplicateMerge } =
  await import("./student-duplicates");

function createCtx({
  schoolId = "school-1",
  role = "Admin",
  updateCount = 1,
}: {
  schoolId?: string | undefined;
  role?: string | null;
  updateCount?: number;
} = {}) {
  const calls: unknown[] = [];
  return {
    ctx: {
      profile: { schoolId },
      currentUser: role
        ? {
            id: "user-1",
            email: "admin@example.com",
            name: "Admin",
            role,
            saasAccountId: null,
          }
        : undefined,
      db: {
        students: {
          updateMany: async (args: unknown) => {
            calls.push(args);
            return { count: updateCount };
          },
        },
      },
    } as any,
    calls,
  };
}

describe("changeStudentGender", () => {
  test("updates by tenant-scoped student id for permitted roles", async () => {
    const { ctx, calls } = createCtx();

    await changeStudentGender(ctx, {
      id: "student-1",
      gender: "Female",
    });

    expect(calls).toEqual([
      {
        where: {
          id: "student-1",
          schoolProfileId: "school-1",
          deletedAt: null,
        },
        data: { gender: "Female" },
      },
    ]);
  });

  test("rejects teacher updates", async () => {
    const { ctx } = createCtx({ role: "Teacher" });

    await expect(
      changeStudentGender(ctx, { id: "student-1", gender: "Male" }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    } satisfies Partial<TRPCError>);
  });

  test("does not report success for cross-tenant students", async () => {
    const { ctx } = createCtx({ updateCount: 0 });

    await expect(
      changeStudentGender(ctx, { id: "student-2", gender: "Female" }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    } satisfies Partial<TRPCError>);
  });
});

describe("getStudents", () => {
  test("defaults active session and term for classroom-only filters", async () => {
    const countCalls: any[] = [];
    const findManyCalls: any[] = [];
    const ctx = {
      profile: {
        schoolId: "school-1",
        sessionId: "session-1",
        termId: "term-1",
      },
      db: {
        students: {
          count: async (args: any) => {
            countCalls.push(args);
            return 0;
          },
          findMany: async (args: any) => {
            findManyCalls.push(args);
            return [];
          },
        },
      },
    } as any;

    await getStudents(ctx, { departmentId: "classroom-a" });

    expect(countCalls[0]?.where).toMatchObject({
      AND: [
        {
          termForms: {
            some: {
              deletedAt: null,
              sessionTermId: "term-1",
              classroomDepartmentId: "classroom-a",
            },
          },
        },
        {
          termForms: {
            some: {
              sessionTermId: "term-1",
            },
          },
        },
      ],
    });
    expect(findManyCalls[0]?.select?.sessionForms?.where).toEqual({
      schoolSessionId: "session-1",
    });
  });
});

function createImportCtx() {
  const classrooms = [
    {
      id: "classroom-a",
      departmentName: "A",
      schoolProfileId: "school-1",
      classRoom: {
        name: "JSS 1",
        schoolSessionId: "session-1",
      },
    },
    {
      id: "classroom-b",
      departmentName: "B",
      schoolProfileId: "school-1",
      classRoom: {
        name: "JSS 1",
        schoolSessionId: "session-1",
      },
    },
  ];
  const existingStudents = [
    {
      id: "student-1",
      name: "John",
      surname: "Doe",
      otherName: null,
      gender: "Male",
      termForms: [
        {
          id: "term-form-1",
          sessionTermId: "term-1",
          schoolSessionId: "session-1",
          classroomDepartmentId: "classroom-a",
          sessionTerm: {
            id: "term-1",
            title: "First Term",
          },
          schoolSession: {
            id: "session-1",
            title: "2026/2027",
          },
          classroomDepartment: {
            id: "classroom-a",
            departmentName: "A",
          },
        },
      ],
    },
    {
      id: "student-2",
      name: "Mary",
      surname: "Major",
      otherName: null,
      gender: "Female",
      termForms: [],
    },
  ];
  const createdSessionForms: unknown[] = [];
  const createdTermForms: unknown[] = [];

  const tx = {
    students: {
      findFirst: async ({ where }: any) =>
        existingStudents.find((student) => student.id === where.id) ?? null,
      update: async () => ({}),
    },
    studentTermForm: {
      findFirst: async () => null,
      create: async ({ data }: any) => {
        createdTermForms.push(data);
        return {
          id: `new-term-form-${createdTermForms.length}`,
          ...data,
        };
      },
    },
    studentSessionForm: {
      findFirst: async () => null,
      create: async ({ data }: any) => {
        createdSessionForms.push(data);
        return {
          id: `new-session-form-${createdSessionForms.length}`,
          ...data,
        };
      },
    },
    financeItem: {
      findMany: async () => [],
    },
    financeCharge: {
      create: async ({ data }: any) => data,
    },
  };

  return {
    ctx: {
      profile: {
        schoolId: "school-1",
        sessionId: "session-1",
        termId: "term-1",
      },
      db: {
        classRoomDepartment: {
          findMany: async ({ where }: any) => {
            const ids = where.id.in as string[];
            return classrooms.filter((classroom) => ids.includes(classroom.id));
          },
        },
        students: {
          findMany: async () => existingStudents,
        },
        $transaction: async (callback: (transaction: typeof tx) => unknown) =>
          callback(tx),
      },
    } as any,
    createdSessionForms,
    createdTermForms,
  };
}

describe("verifyStudentImport", () => {
  test("returns a typed error for classroom ids outside the active tenant session", async () => {
    const { ctx } = createImportCtx();

    await expect(
      verifyStudentImport(ctx, {
        rows: [
          {
            lineNumber: 1,
            originalText: "Jane Doe",
            name: "Jane",
            surname: "Doe",
            gender: "Female",
            classroomDepartmentId: "missing-classroom",
          },
        ],
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message:
        "One or more selected classroom departments were not found, unauthorized, or not in the active session.",
    } satisfies Partial<TRPCError>);
  });

  test("returns a typed error when active school session context is missing", async () => {
    const { ctx } = createImportCtx();
    ctx.profile.sessionId = undefined;

    await expect(
      verifyStudentImport(ctx, {
        rows: [
          {
            lineNumber: 1,
            originalText: "Jane Doe",
            name: "Jane",
            surname: "Doe",
            gender: "Female",
            classroomDepartmentId: "classroom-a",
          },
        ],
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Active school, session, and term are required",
    } satisfies Partial<TRPCError>);
  });

  test("uses each row target classroom for current-classroom matching", async () => {
    const { ctx } = createImportCtx();

    const report = await verifyStudentImport(ctx, {
      rows: [
        {
          lineNumber: 1,
          originalText: "John Doe",
          name: "John",
          surname: "Doe",
          gender: "Male",
          classroomDepartmentId: "classroom-a",
        },
        {
          lineNumber: 2,
          originalText: "John Doe",
          name: "John",
          surname: "Doe",
          gender: "Male",
          classroomDepartmentId: "classroom-b",
        },
      ],
    });

    expect(report.results.map((row) => row.classroomDepartmentId)).toEqual([
      "classroom-a",
      "classroom-b",
    ]);
    expect(
      report.results.map((row) => row.fullMatch?.isCurrentClassroomMatch),
    ).toEqual([true, false]);
  });
});

describe("executeStudentImport", () => {
  test("returns a typed error when no target classroom is available", async () => {
    const { ctx } = createImportCtx();

    await expect(
      executeStudentImport(ctx, {
        rows: [
          {
            lineNumber: 1,
            name: "Jane",
            surname: "Doe",
            gender: "Female",
            action: "import_new",
          },
        ],
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "At least one classroom is required",
    } satisfies Partial<TRPCError>);
  });

  test("returns a typed error for classrooms outside the active school", async () => {
    const { ctx } = createImportCtx();

    await expect(
      executeStudentImport(ctx, {
        rows: [
          {
            lineNumber: 1,
            name: "Jane",
            surname: "Doe",
            gender: "Female",
            classroomDepartmentId: "missing-classroom",
            action: "import_new",
          },
        ],
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message:
        "One or more selected classrooms do not belong to the active school",
    } satisfies Partial<TRPCError>);
  });

  test("creates matched-student term sheets in each row target classroom", async () => {
    const { ctx, createdSessionForms, createdTermForms } = createImportCtx();

    const result = await executeStudentImport(ctx, {
      rows: [
        {
          lineNumber: 1,
          name: "John",
          surname: "Doe",
          gender: "Male",
          classroomDepartmentId: "classroom-a",
          action: "keep_match",
          existingStudentId: "student-1",
        },
        {
          lineNumber: 2,
          name: "Mary",
          surname: "Major",
          gender: "Female",
          classroomDepartmentId: "classroom-b",
          action: "keep_match",
          existingStudentId: "student-2",
        },
      ],
    });

    expect(result).toMatchObject({
      keptMatches: 2,
      termSheetsCreated: 2,
      failedRows: 0,
    });
    expect(
      createdSessionForms.map((form: any) => form.classroomDepartmentId),
    ).toEqual(["classroom-a", "classroom-b"]);
    expect(
      createdTermForms.map((form: any) => form.classroomDepartmentId),
    ).toEqual(["classroom-a", "classroom-b"]);
  });
});

function createDuplicateCtx({
  firstAssessmentCount = 0,
  secondAssessmentCount = 0,
  assessmentRecords = [],
}: {
  firstAssessmentCount?: number;
  secondAssessmentCount?: number;
  assessmentRecords?: Array<{
    id: number;
    classSubjectAssessmentId: number | null;
    studentId: string | null;
    studentTermFormId: string | null;
  }>;
} = {}) {
  const termForms = [
    {
      id: "term-form-history",
      studentSessionFormId: "session-form-history",
      classroomDepartmentId: "classroom-a",
      sessionTermId: "term-1",
      createdAt: new Date("2025-01-01"),
      classroomDepartment: {
        id: "classroom-a",
        departmentName: "A",
        classRoom: { name: "JSS 1" },
      },
      _count: {
        assessmentRecords: firstAssessmentCount,
        attendanceList: 3,
        financeCharges: 2,
      },
      student: {
        id: "student-history",
        name: "Aisha",
        surname: "Bello",
        otherName: null,
        gender: "Female",
        createdAt: new Date("2024-01-01"),
        _count: {
          sessionForms: 2,
          termForms: 4,
          guardians: 1,
          assessmentRecords: 5,
          financeCharges: 3,
          financePayments: 2,
        },
      },
    },
    {
      id: "term-form-current",
      studentSessionFormId: "session-form-current",
      classroomDepartmentId: "classroom-a",
      sessionTermId: "term-1",
      createdAt: new Date("2026-01-01"),
      classroomDepartment: {
        id: "classroom-a",
        departmentName: "A",
        classRoom: { name: "JSS 1" },
      },
      _count: {
        assessmentRecords: secondAssessmentCount,
        attendanceList: 0,
        financeCharges: 0,
      },
      student: {
        id: "student-current",
        name: "  Aisha ",
        surname: "Bello",
        otherName: null,
        gender: "Female",
        createdAt: new Date("2026-01-01"),
        _count: {
          sessionForms: 1,
          termForms: 1,
          guardians: 0,
          assessmentRecords: 0,
          financeCharges: 0,
          financePayments: 0,
        },
      },
    },
    {
      id: "term-form-other-name",
      studentSessionFormId: "session-form-other-name",
      classroomDepartmentId: "classroom-a",
      sessionTermId: "term-1",
      createdAt: new Date("2026-01-02"),
      classroomDepartment: {
        id: "classroom-a",
        departmentName: "A",
        classRoom: { name: "JSS 1" },
      },
      _count: {
        assessmentRecords: 0,
        attendanceList: 0,
        financeCharges: 0,
      },
      student: {
        id: "student-other-name",
        name: "Aisha",
        surname: "Bello",
        otherName: "Khadijah",
        gender: "Female",
        createdAt: new Date("2026-01-02"),
        _count: {
          sessionForms: 1,
          termForms: 1,
          guardians: 0,
          assessmentRecords: 0,
          financeCharges: 0,
          financePayments: 0,
        },
      },
    },
  ];

  return {
    profile: {
      schoolId: "school-1",
      sessionId: "session-1",
      termId: "term-1",
    },
    currentUser: {
      id: "user-1",
      role: "Admin",
    },
    db: {
      studentTermForm: {
        findMany: async ({ where }: any) => {
          const studentIds = where.studentId?.in as string[] | undefined;
          return termForms.filter(
            (termForm) =>
              (!where.classroomDepartmentId ||
                termForm.classroomDepartmentId === where.classroomDepartmentId) &&
              termForm.sessionTermId === where.sessionTermId &&
              (!studentIds || studentIds.includes(termForm.student.id)),
          );
        },
      },
      studentAssessmentRecord: {
        findMany: async () => assessmentRecords,
      },
    },
  } as any;
}

describe("student duplicate detection", () => {
  test("groups exact normalized full names within the same class and term", async () => {
    const ctx = createDuplicateCtx();

    const result = await getStudentDuplicateGroups(ctx, {
      classroomDepartmentId: "classroom-a",
    });

    expect(result).toMatchObject({
      duplicateGroupCount: 1,
      duplicateStudentCount: 2,
    });
    expect(result.groups[0]?.members.map((member) => member.studentId)).toEqual([
      "student-history",
      "student-current",
    ]);
    expect(result.groups[0]?.recommendedSurvivorId).toBe("student-history");
  });

  test("preview blocks merge when multiple current copies have assessment records", async () => {
    const ctx = createDuplicateCtx({
      firstAssessmentCount: 1,
      secondAssessmentCount: 1,
    });

    const preview = await previewStudentDuplicateMerge(ctx, {
      classroomDepartmentId: "classroom-a",
      survivorStudentId: "student-history",
      duplicateStudentIds: ["student-current"],
    });

    expect(preview.canMerge).toBe(false);
    expect(preview.conflicts).toContain(
      "Multiple duplicate copies have current-term assessment records. Review scores before merging.",
    );
  });

  test("preview allows moving a single current copy into the history survivor", async () => {
    const ctx = createDuplicateCtx({
      firstAssessmentCount: 0,
      secondAssessmentCount: 1,
    });

    const preview = await previewStudentDuplicateMerge(ctx, {
      classroomDepartmentId: "classroom-a",
      survivorStudentId: "student-history",
      duplicateStudentIds: ["student-current"],
    });

    expect(preview.canMerge).toBe(true);
    expect(preview.conflicts).toEqual([]);
    expect(preview.recordsToMove.assessmentRecords).toBe(1);
  });

  test("preview blocks assessment unique-key collisions before merge", async () => {
    const ctx = createDuplicateCtx({
      assessmentRecords: [
        {
          id: 1,
          classSubjectAssessmentId: 100,
          studentId: "student-history",
          studentTermFormId: "term-form-history",
        },
        {
          id: 2,
          classSubjectAssessmentId: 100,
          studentId: "student-current",
          studentTermFormId: "term-form-current",
        },
      ],
    });

    const preview = await previewStudentDuplicateMerge(ctx, {
      classroomDepartmentId: "classroom-a",
      survivorStudentId: "student-history",
      duplicateStudentIds: ["student-current"],
    });

    expect(preview.canMerge).toBe(false);
    expect(preview.conflicts).toContain(
      "The survivor and duplicate copy both have a record for the same assessment. Review scores before merging.",
    );
  });
});
