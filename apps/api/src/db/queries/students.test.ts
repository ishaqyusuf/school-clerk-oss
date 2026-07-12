import { describe, expect, test } from "bun:test";
import { TRPCError } from "@trpc/server";

process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";
process.env.POSTGRES_URL ??= process.env.DATABASE_URL;

const { changeStudentGender, executeStudentImport, verifyStudentImport } =
  await import("./students");

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
