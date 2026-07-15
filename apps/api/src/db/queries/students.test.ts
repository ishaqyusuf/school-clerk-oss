import { describe, expect, test } from "bun:test";
import { TRPCError } from "@trpc/server";

process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";

const {
  changeStudentGender,
  executeStudentImport,
  getStudentImportJob,
  getStudents,
  processStudentImportJob,
  startStudentImportJob,
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
    {
      id: "primary-1-primary-1",
      departmentName: "الأول الإبتدائي",
      schoolProfileId: "school-1",
      classRoom: {
        name: "الأول الإبتدائي",
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
  const createdStudents: unknown[] = [];
  const createdSessionForms: unknown[] = [];
  const createdTermForms: unknown[] = [];

  const tx = {
    students: {
      findFirst: async ({ where }: any) =>
        existingStudents.find((student) => student.id === where.id) ?? null,
      create: async ({ data }: any) => {
        const student = {
          id: `new-student-${createdStudents.length + 1}`,
          gender: data.gender,
          name: data.name,
          surname: data.surname,
          otherName: data.otherName ?? null,
          schoolProfileId: data.schoolProfileId,
          sessionForms: [
            {
              id: `new-session-form-${createdStudents.length + 1}`,
              ...data.sessionForms.create,
              termForms: [
                {
                  id: `new-term-form-${createdStudents.length + 1}`,
                  ...data.sessionForms.create.termForms.create,
                },
              ],
            },
          ],
        };
        createdStudents.push(student);
        return student;
      },
      update: async () => ({}),
    },
    studentTermForm: {
      findMany: async () => [],
      findFirst: async () => null,
      create: async ({ data }: any) => {
        createdTermForms.push(data);
        return {
          id: `new-term-form-${createdTermForms.length}`,
          ...data,
        };
      },
      update: async ({ where, data }: any) => ({ id: where.id, ...data }),
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
    createdStudents,
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

  test("creates Arabic fallback-classroom female rows as new students", async () => {
    const { ctx, createdStudents } = createImportCtx();

    const result = await executeStudentImport(ctx, {
      classroomDepartmentId: "primary-1-primary-1",
      rows: [
        {
          lineNumber: 2,
          name: "بلقيس",
          surname: "أحمد",
          gender: "Female",
          classroomDepartmentId: "primary-1-primary-1",
          action: "import_new",
        },
        {
          lineNumber: 3,
          name: "بلقيس",
          surname: "أونيكون",
          gender: "Female",
          classroomDepartmentId: "primary-1-primary-1",
          action: "import_new",
        },
        {
          lineNumber: 4,
          name: "بلقيس",
          surname: "إبراهيم",
          gender: "Female",
          classroomDepartmentId: "primary-1-primary-1",
          action: "import_new",
        },
        {
          lineNumber: 5,
          name: "حنيفة",
          surname: "عيسى",
          gender: "Female",
          classroomDepartmentId: "primary-1-primary-1",
          action: "import_new",
        },
        {
          lineNumber: 6,
          name: "حليمة",
          surname: "عثمان",
          gender: "Female",
          classroomDepartmentId: "primary-1-primary-1",
          action: "import_new",
        },
      ],
    });

    expect(result).toMatchObject({
      createdStudents: 5,
      termSheetsCreated: 5,
      failedRows: 0,
    });
    expect(result.rows.map((row) => row.status)).toEqual([
      "created",
      "created",
      "created",
      "created",
      "created",
    ]);
    expect(
      createdStudents.map((student: any) => ({
        name: student.name,
        surname: student.surname,
        gender: student.gender,
        classroomDepartmentId: student.sessionForms[0]?.classroomDepartmentId,
      })),
    ).toEqual([
      {
        name: "بلقيس",
        surname: "أحمد",
        gender: "Female",
        classroomDepartmentId: "primary-1-primary-1",
      },
      {
        name: "بلقيس",
        surname: "أونيكون",
        gender: "Female",
        classroomDepartmentId: "primary-1-primary-1",
      },
      {
        name: "بلقيس",
        surname: "إبراهيم",
        gender: "Female",
        classroomDepartmentId: "primary-1-primary-1",
      },
      {
        name: "حنيفة",
        surname: "عيسى",
        gender: "Female",
        classroomDepartmentId: "primary-1-primary-1",
      },
      {
        name: "حليمة",
        surname: "عثمان",
        gender: "Female",
        classroomDepartmentId: "primary-1-primary-1",
      },
    ]);
  });
});

function createImportJobCtx() {
  const base = createImportCtx();
  const jobs: any[] = [];
  const jobRows: any[] = [];
  const jobUpdates: any[] = [];
  let jobCounter = 0;
  let rowCounter = 0;
  const now = new Date("2026-07-14T10:00:00.000Z");

  return {
    ...base,
    jobs,
    jobRows,
    jobUpdates,
    ctx: {
      ...base.ctx,
      currentUser: {
        id: "user-1",
        email: "admin@example.com",
        name: "Admin",
        role: "Admin",
        saasAccountId: null,
      },
      db: {
        ...base.ctx.db,
        studentImportJob: {
          create: async ({ data }: any) => {
            const job = {
              id: `job-${++jobCounter}`,
              status: "PENDING",
              totalRows: data.totalRows,
              processedRows: data.processedRows ?? 0,
              createdStudents: data.createdStudents ?? 0,
              keptMatches: data.keptMatches ?? 0,
              updatedMatches: data.updatedMatches ?? 0,
              termSheetsCreated: data.termSheetsCreated ?? 0,
              skippedRows: data.skippedRows ?? 0,
              failedRows: data.failedRows ?? 0,
              errorMessage: data.errorMessage ?? null,
              triggerRunId: data.triggerRunId ?? null,
              schoolProfileId: data.schoolProfileId,
              schoolSessionId: data.schoolSessionId,
              sessionTermId: data.sessionTermId,
              createdByUserId: data.createdByUserId ?? null,
              createdAt: now,
              updatedAt: now,
            };
            jobs.push(job);
            return job;
          },
          findFirst: async ({ where }: any) => {
            let candidates = jobs.filter((job) => job.deletedAt == null);
            if (where.schoolProfileId) {
              candidates = candidates.filter(
                (job) => job.schoolProfileId === where.schoolProfileId,
              );
            }
            if (where.id) {
              candidates = candidates.filter((job) => job.id === where.id);
            }
            if (where.createdByUserId) {
              candidates = candidates.filter(
                (job) => job.createdByUserId === where.createdByUserId,
              );
            }
            if (where.status?.in) {
              candidates = candidates.filter((job) =>
                where.status.in.includes(job.status),
              );
            }
            return candidates[0] ?? null;
          },
          update: async ({ where, data }: any) => {
            const job = jobs.find((candidate) => candidate.id === where.id);
            jobUpdates.push({ id: where.id, data: { ...data } });
            Object.assign(job, data, { updatedAt: now });
            return job;
          },
        },
        studentImportJobRow: {
          createMany: async ({ data }: any) => {
            for (const row of data) {
              jobRows.push({
                id: `job-row-${++rowCounter}`,
                status: "PENDING",
                studentId: null,
                termSheetCreated: false,
                reason: null,
                completedAt: null,
                ...row,
                createdAt: now,
                updatedAt: now,
              });
            }
            return { count: data.length };
          },
          findMany: async ({ where }: any) =>
            jobRows
              .filter((row) => row.jobId === where.jobId)
              .filter((row) =>
                where.status?.in ? where.status.in.includes(row.status) : true,
              )
              .sort((a, b) => a.lineNumber - b.lineNumber),
          update: async ({ where, data }: any) => {
            const row = jobRows.find((candidate) => candidate.id === where.id);
            Object.assign(row, data, { updatedAt: now });
            return row;
          },
        },
      },
    } as any,
  };
}

describe("student import jobs", () => {
  test("creates a pending tenant-scoped import job with persisted row payloads", async () => {
    const { ctx, jobs, jobRows } = createImportJobCtx();

    const job = await startStudentImportJob(
      ctx,
      {
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
      },
      { enqueue: false },
    );

    expect(job).toMatchObject({
      id: "job-1",
      status: "PENDING",
      totalRows: 2,
      processedRows: 0,
      createdStudents: 0,
      failedRows: 0,
    });
    expect(jobs[0]).toMatchObject({
      schoolProfileId: "school-1",
      schoolSessionId: "session-1",
      sessionTermId: "term-1",
      createdByUserId: "user-1",
    });
    expect(jobRows.map((row) => row.lineNumber)).toEqual([1, 2]);
    expect(jobRows[0]?.payload).toMatchObject({
      action: "keep_match",
      existingStudentId: "student-1",
    });
  });

  test("persists the effective classroom fallback on job rows", async () => {
    const { ctx, jobRows } = createImportJobCtx();

    await startStudentImportJob(
      ctx,
      {
        classroomDepartmentId: "classroom-a",
        rows: [
          {
            lineNumber: 1,
            name: "John",
            surname: "Doe",
            gender: "Male",
            action: "keep_match",
            existingStudentId: "student-1",
          },
        ],
      },
      { enqueue: false },
    );

    expect(jobRows[0]?.payload).toMatchObject({
      classroomDepartmentId: "classroom-a",
    });
  });

  test("reads only tenant-owned import jobs", async () => {
    const { ctx, jobs } = createImportJobCtx();
    jobs.push({
      id: "job-foreign",
      status: "COMPLETED",
      totalRows: 1,
      processedRows: 1,
      createdStudents: 1,
      keptMatches: 0,
      updatedMatches: 0,
      termSheetsCreated: 1,
      skippedRows: 0,
      failedRows: 0,
      schoolProfileId: "other-school",
      schoolSessionId: "session-1",
      sessionTermId: "term-1",
      createdByUserId: "user-1",
      deletedAt: null,
    });

    await expect(
      getStudentImportJob(ctx, { jobId: "job-foreign" }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    } satisfies Partial<TRPCError>);
  });

  test("returns null when no recoverable import job exists", async () => {
    const { ctx } = createImportJobCtx();

    await expect(getStudentImportJob(ctx)).resolves.toBeNull();
  });

  test("processes only pending rows and does not double-count completed rows", async () => {
    const { ctx, jobs, jobRows, createdTermForms } = createImportJobCtx();
    jobs.push({
      id: "job-1",
      status: "RUNNING",
      totalRows: 2,
      processedRows: 1,
      createdStudents: 0,
      keptMatches: 1,
      updatedMatches: 0,
      termSheetsCreated: 1,
      skippedRows: 0,
      failedRows: 0,
      schoolProfileId: "school-1",
      schoolSessionId: "session-1",
      sessionTermId: "term-1",
      createdByUserId: "user-1",
      deletedAt: null,
    });
    jobRows.push(
      {
        id: "job-row-1",
        jobId: "job-1",
        lineNumber: 1,
        action: "keep_match",
        status: "KEPT",
        studentId: "student-1",
        termSheetCreated: true,
        reason: null,
        completedAt: new Date("2026-07-14T09:00:00.000Z"),
        payload: {
          lineNumber: 1,
          name: "John",
          surname: "Doe",
          gender: "Male",
          classroomDepartmentId: "classroom-a",
          action: "keep_match",
          existingStudentId: "student-1",
        },
      },
      {
        id: "job-row-2",
        jobId: "job-1",
        lineNumber: 2,
        action: "keep_match",
        status: "PENDING",
        studentId: null,
        termSheetCreated: false,
        reason: null,
        completedAt: null,
        payload: {
          lineNumber: 2,
          name: "Mary",
          surname: "Major",
          gender: "Female",
          classroomDepartmentId: "classroom-b",
          action: "keep_match",
          existingStudentId: "student-2",
        },
      },
    );

    const result = await processStudentImportJob(ctx.db, "job-1");

    expect(result).toMatchObject({
      status: "COMPLETED",
      processedRows: 2,
      keptMatches: 2,
      termSheetsCreated: 2,
      failedRows: 0,
    });
    expect(createdTermForms).toHaveLength(1);
    expect(jobRows.map((row) => row.status)).toEqual(["KEPT", "KEPT"]);
  });

  test("persists aggregate progress after each bounded chunk", async () => {
    const { ctx, jobs, jobRows, jobUpdates } = createImportJobCtx();
    jobs.push({
      id: "job-1",
      status: "PENDING",
      totalRows: 26,
      processedRows: 0,
      createdStudents: 0,
      keptMatches: 0,
      updatedMatches: 0,
      termSheetsCreated: 0,
      skippedRows: 0,
      failedRows: 0,
      schoolProfileId: "school-1",
      schoolSessionId: "session-1",
      sessionTermId: "term-1",
      createdByUserId: "user-1",
      deletedAt: null,
    });

    for (let lineNumber = 1; lineNumber <= 26; lineNumber += 1) {
      jobRows.push({
        id: `job-row-${lineNumber}`,
        jobId: "job-1",
        lineNumber,
        action: "keep_match",
        status: "PENDING",
        studentId: null,
        termSheetCreated: false,
        reason: null,
        completedAt: null,
        payload: {
          lineNumber,
          name: "Mary",
          surname: "Major",
          gender: "Female",
          classroomDepartmentId: "classroom-b",
          action: "keep_match",
          existingStudentId: "student-2",
        },
      });
    }

    const result = await processStudentImportJob(ctx.db, "job-1");
    const progressUpdates = jobUpdates
      .map((update) => update.data)
      .filter((data) => typeof data.processedRows === "number");

    expect(progressUpdates[0]).toMatchObject({
      status: "RUNNING",
      processedRows: 25,
      keptMatches: 25,
    });
    expect(progressUpdates.at(-1)).toMatchObject({
      status: "COMPLETED",
      processedRows: 26,
      keptMatches: 26,
    });
    expect(result).toMatchObject({
      status: "COMPLETED",
      processedRows: 26,
      keptMatches: 26,
      failedRows: 0,
    });
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
                termForm.classroomDepartmentId ===
                  where.classroomDepartmentId) &&
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
    expect(result.groups[0]?.members.map((member) => member.studentId)).toEqual(
      ["student-history", "student-current"],
    );
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
