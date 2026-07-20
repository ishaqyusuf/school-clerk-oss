import { describe, expect, test } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import { TRPCError } from "@trpc/server";
import {
  activateAcademicTerm,
  applyAcademicTermSetup,
  assertAcademicTermWritable,
  closeAcademicTerm,
  findPreviousAcademicTerm,
  previewAcademicTermActivation,
  previewAcademicTermSetup,
  requireAcademicAdmin,
} from "./academic-term-setup";

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@127.0.0.1:55432/school_clerk";

function createSetupContext({ targetSessionId = "session-1" } = {}) {
  const now = new Date("2026-01-01T00:00:00.000Z");
  const terms = [
    {
      id: "term-source",
      sessionId: "session-1",
      title: "First Term",
      startDate: new Date("2025-09-01T00:00:00.000Z"),
      endDate: new Date("2025-12-15T00:00:00.000Z"),
      createdAt: new Date("2025-08-01T00:00:00.000Z"),
      lifecycleStatus: "CLOSED",
      setupCompletedAt: now,
      note: null,
      session: { id: "session-1", title: "2025/2026" },
    },
    {
      id: "term-target",
      sessionId: targetSessionId,
      title: "Second Term",
      startDate: new Date("2026-01-05T00:00:00.000Z"),
      endDate: new Date("2026-04-01T00:00:00.000Z"),
      createdAt: new Date("2025-12-20T00:00:00.000Z"),
      lifecycleStatus: "DRAFT",
      setupCompletedAt: null,
      note: null,
      session: { id: targetSessionId, title: "2025/2026" },
    },
  ];
  const source = {
    id: "term-source",
    title: "First Term",
    sessionId: "session-1",
    session: {
      id: "session-1",
      title: "2025/2026",
      classRooms: [
        {
          id: "class-1",
          name: "JSS 1",
          classLevel: 1,
          classRoomDepartments: [
            {
              id: "department-1",
              departmentName: "A",
              departmentLevel: 1,
            },
          ],
        },
      ],
    },
    departmentSubjects: [
      {
        id: "department-subject-source",
        subjectId: "subject-1",
        classRoomDepartmentId: "department-1",
        description: "Mathematics",
        subject: { title: "Mathematics" },
        classRoomDepartment: {
          departmentName: "A",
          classRoom: { id: "class-1", name: "JSS 1" },
        },
        assessments: [
          {
            id: 10,
            title: "Continuous Assessment",
            obtainable: 40,
            percentageObtainable: 40,
            index: 1,
            isGroup: false,
            printMode: "EXPANDED",
            parentAssessmentId: null,
          },
        ],
      },
    ],
    termForms: [
      {
        id: "source-form-1",
        studentId: "student-1",
        studentSessionFormId: "student-session-1",
        classroomDepartmentId: "department-1",
        student: {
          id: "student-1",
          name: "Amina",
          surname: "Bello",
          otherName: null,
        },
        classroomDepartment: {
          departmentName: "A",
          classRoom: { id: "class-1", name: "JSS 1" },
        },
      },
    ],
    staffTermProfiles: [
      {
        id: "staff-term-source",
        staffProfileId: "staff-1",
        staffProfile: {
          id: "staff-1",
          name: "Teacher One",
          subjects: [{ departmentSubjectId: "department-subject-source" }],
        },
        classroomsProfiles: [
          {
            classRoomDepartmentId: "department-1",
            subjectAccessMode: "SELECTED",
          },
        ],
        academicAccessGrants: [
          {
            scope: "DEPARTMENT_SUBJECT",
            classRoomId: null,
            classRoomDepartmentId: "department-1",
            subjectId: "subject-1",
            departmentSubjectId: "department-subject-source",
          },
        ],
      },
    ],
  };
  const state = {
    runs: [] as any[],
    targetSubjects: [] as any[],
    assessments: [] as any[],
    studentForms: [] as any[],
    financeCharges: [] as any[],
    staffTermProfiles: [] as any[],
    classroomAssignments: [] as any[],
    grants: [] as any[],
    staffSubjects: [] as any[],
    activities: [] as any[],
  };

  const db: any = {
    schoolProfile: {
      findFirst: async () => ({
        id: "school-1",
        activeSessionTermId: "term-source",
      }),
      update: async () => ({}),
    },
    sessionTerm: {
      findMany: async () => terms,
      findFirst: async ({ where }: any) =>
        where.id === "term-source" ? source : null,
      update: async ({ where, data }: any) => {
        const term = terms.find((item) => item.id === where.id)!;
        Object.assign(term, data);
        return term;
      },
    },
    classRoom: {
      findMany: async ({ where }: any) =>
        where.schoolSessionId === "session-1" ? source.session.classRooms : [],
      create: async ({ data }: any) => ({ id: "target-class-1", ...data }),
    },
    classRoomDepartment: {
      create: async ({ data }: any) => ({
        id: "target-department-1",
        ...data,
      }),
    },
    financeItem: {
      findMany: async () => [
        {
          id: "fee-1",
          name: "Tuition",
          description: null,
          amount: 10_000,
          streamId: "stream-1",
          collectable: true,
          stream: { id: "stream-1" },
          applicableClasses: [
            { classRoomDepartmentId: "department-1", deletedAt: null },
          ],
        },
      ],
    },
    academicTermSetupRun: {
      findUnique: async ({ where }: any) =>
        state.runs.find(
          (run) =>
            run.schoolProfileId ===
              where.schoolProfileId_idempotencyKey.schoolProfileId &&
            run.idempotencyKey ===
              where.schoolProfileId_idempotencyKey.idempotencyKey,
        ) ?? null,
      findFirst: async () => state.runs.at(-1) ?? null,
      create: async ({ data }: any) => {
        const run = { id: "run-1", ...data };
        state.runs.push(run);
        return run;
      },
      update: async ({ where, data }: any) => {
        const run = state.runs.find((item) => item.id === where.id)!;
        Object.assign(run, data);
        return run;
      },
    },
    departmentSubject: {
      findFirst: async ({ where }: any) =>
        state.targetSubjects.find(
          (item) =>
            item.sessionTermId === where.sessionTermId &&
            item.classRoomDepartmentId === where.classRoomDepartmentId &&
            item.subjectId === where.subjectId,
        ) ?? null,
      create: async ({ data }: any) => {
        const item = {
          id: "department-subject-target",
          ...data,
        };
        state.targetSubjects.push(item);
        return item;
      },
    },
    classroomSubjectAssessment: {
      findMany: async ({ where }: any) =>
        state.assessments.filter(
          (item) => item.departmentSubjectId === where.departmentSubjectId,
        ),
      create: async ({ data }: any) => {
        const item = { id: 20 + state.assessments.length, ...data };
        state.assessments.push(item);
        return item;
      },
    },
    studentTermForm: {
      findFirst: async ({ where }: any) =>
        state.studentForms.find(
          (item) =>
            item.sessionTermId === where.sessionTermId &&
            item.studentId === where.studentId,
        ) ?? null,
      create: async ({ data }: any) => {
        const item = { id: "target-form-1", ...data };
        state.studentForms.push(item);
        return item;
      },
    },
    financeCharge: {
      create: async ({ data }: any) => {
        const charge = {
          id: `charge-${state.financeCharges.length + 1}`,
          ...data,
        };
        state.financeCharges.push(charge);
        return charge;
      },
    },
    staffTermProfile: {
      findFirst: async ({ where }: any) =>
        state.staffTermProfiles.find(
          (item) =>
            item.staffProfileId === where.staffProfileId &&
            item.sessionTermId === where.sessionTermId,
        ) ?? null,
      create: async ({ data }: any) => {
        const item = { id: "staff-term-target", ...data };
        state.staffTermProfiles.push(item);
        return item;
      },
    },
    staffClassroomDepartmentTermProfiles: {
      findFirst: async ({ where }: any) =>
        state.classroomAssignments.find(
          (item) =>
            item.staffTermProfileId === where.staffTermProfileId &&
            item.classRoomDepartmentId === where.classRoomDepartmentId,
        ) ?? null,
      create: async ({ data }: any) => {
        state.classroomAssignments.push(data);
        return data;
      },
    },
    staffAcademicAccessGrant: {
      findFirst: async ({ where }: any) =>
        state.grants.find(
          (item) =>
            item.staffTermProfileId === where.staffTermProfileId &&
            item.scope === where.scope,
        ) ?? null,
      create: async ({ data }: any) => {
        state.grants.push(data);
        return data;
      },
    },
    staffSubject: {
      findFirst: async ({ where }: any) =>
        state.staffSubjects.find(
          (item) =>
            item.staffProfilesId === where.staffProfilesId &&
            item.departmentSubjectId === where.departmentSubjectId,
        ) ?? null,
      create: async ({ data }: any) => {
        state.staffSubjects.push(data);
        return data;
      },
    },
    activity: {
      create: async ({ data }: any) => {
        state.activities.push(data);
        return data;
      },
    },
    $transaction: async (callback: (transaction: any) => unknown) =>
      callback(db),
  };

  const ctx = {
    profile: {
      schoolId: "school-1",
      sessionId: targetSessionId,
      termId: "term-target",
    },
    currentUser: {
      id: "user-1",
      name: "Admin One",
      email: "admin@school.test",
      role: "Admin",
      saasAccountId: "account-1",
    },
    db,
  } as unknown as TRPCContext;

  return { ctx, state };
}

const setupInput = {
  termId: "term-target",
  previousTermId: "term-source",
  classroomOption: "copy-all" as const,
  subjectOption: "copy-all" as const,
  studentOption: "copy-all" as const,
  teacherOption: "copy-all" as const,
  selectedClassroomIds: [],
  selectedSubjectIds: [],
  selectedStudentIds: [],
  selectedTeacherIds: [],
};

function createLifecycleContext({ financeClosed = false } = {}) {
  const state = {
    activeSessionTermId: "term-source",
    activities: [] as any[],
    terms: [
      {
        id: "term-source",
        sessionId: "session-1",
        schoolId: "school-1",
        title: "First Term",
        startDate: new Date("2025-09-01T00:00:00.000Z"),
        endDate: new Date("2025-12-15T00:00:00.000Z"),
        createdAt: new Date("2025-08-01T00:00:00.000Z"),
        deletedAt: null,
        lifecycleStatus: "ACTIVE",
        setupCompletedAt: new Date("2025-08-20T00:00:00.000Z"),
        note: null,
        session: { id: "session-1", title: "2025/2026" },
      },
      {
        id: "term-target",
        sessionId: "session-1",
        schoolId: "school-1",
        title: "Second Term",
        startDate: new Date("2026-01-05T00:00:00.000Z"),
        endDate: new Date("2026-04-01T00:00:00.000Z"),
        createdAt: new Date("2025-12-20T00:00:00.000Z"),
        deletedAt: null,
        lifecycleStatus: "READY",
        setupCompletedAt: new Date("2025-12-22T00:00:00.000Z"),
        note: null,
        session: { id: "session-1", title: "2025/2026" },
      },
    ],
  };
  const db: any = {
    schoolProfile: {
      findFirst: async () => ({
        id: "school-1",
        activeSessionTermId: state.activeSessionTermId,
      }),
      update: async ({ data }: any) => {
        state.activeSessionTermId = data.activeSessionTermId;
        return { id: "school-1" };
      },
    },
    sessionTerm: {
      findMany: async () => state.terms,
      findFirst: async ({ where }: any) =>
        state.terms.find(
          (term) => term.id === where.id && term.schoolId === where.schoolId,
        ) ?? null,
      update: async ({ where, data }: any) => {
        const term = state.terms.find((item) => item.id === where.id)!;
        Object.assign(term, data);
        return term;
      },
    },
    financeTermLedgerClose: {
      findFirst: async () => (financeClosed ? { id: "finance-close-1" } : null),
    },
    academicTermSetupRun: {
      findFirst: async () => ({
        sourceTermId: "term-source",
        sourceTerm: { sessionId: "session-1" },
      }),
    },
    activity: {
      create: async ({ data }: any) => {
        state.activities.push(data);
        return data;
      },
    },
    $transaction: async (callback: (transaction: any) => unknown) =>
      callback(db),
  };
  const ctx = {
    profile: {
      schoolId: "school-1",
      sessionId: "session-1",
      termId: "term-source",
    },
    currentUser: {
      id: "user-1",
      name: "Admin One",
      email: "admin@school.test",
      role: "Admin",
      saasAccountId: "account-1",
    },
    db,
  } as unknown as TRPCContext;

  return { ctx, state };
}

describe("academic term setup", () => {
  test("resolves the previous term deterministically", () => {
    expect(
      findPreviousAcademicTerm(
        [
          {
            id: "third",
            startDate: new Date("2026-05-01"),
            createdAt: null,
          },
          {
            id: "first",
            startDate: new Date("2025-09-01"),
            createdAt: null,
          },
          {
            id: "second",
            startDate: new Date("2026-01-01"),
            createdAt: null,
          },
        ],
        "third",
      )?.id,
    ).toBe("second");
  });

  test("rejects a school outside the authenticated account", async () => {
    const { ctx } = createSetupContext();
    (ctx.db.schoolProfile.findFirst as any) = async () => null;

    await expect(requireAcademicAdmin(ctx)).rejects.toMatchObject({
      code: "FORBIDDEN",
    } satisfies Partial<TRPCError>);
  });

  test("blocks direct student copying across sessions", async () => {
    const { ctx } = createSetupContext({ targetSessionId: "session-2" });

    const preview = await previewAcademicTermSetup(ctx, setupInput);

    expect(preview.promotional).toBe(true);
    expect(preview.blockers).toContainEqual(
      expect.objectContaining({ key: "student-progression-required" }),
    );
  });

  test("supports an explicit empty source for first-school onboarding", async () => {
    const { ctx } = createSetupContext();

    const preview = await previewAcademicTermSetup(ctx, {
      ...setupInput,
      previousTermId: null,
      classroomOption: "empty",
      subjectOption: "empty",
      studentOption: "empty",
      teacherOption: "empty",
    });

    expect(preview.source).toBeNull();
    expect(preview.blockers).toEqual([]);
  });

  test("blocks selected teachers when their cross-session classrooms are omitted", async () => {
    const { ctx } = createSetupContext({ targetSessionId: "session-2" });

    const preview = await previewAcademicTermSetup(ctx, {
      ...setupInput,
      classroomOption: "empty",
      studentOption: "empty",
    });

    expect(preview.blockers).toContainEqual(
      expect.objectContaining({ key: "teacher-classroom-not-mapped" }),
    );
  });

  test("copies the complete same-session rollover once and reuses an idempotent retry", async () => {
    const { ctx, state } = createSetupContext();
    const input = {
      ...setupInput,
      idempotencyKey: "term-target-rollover-1",
    };

    const first = await applyAcademicTermSetup(ctx, input);
    const second = await applyAcademicTermSetup(ctx, input);

    expect(first.alreadyApplied).toBe(false);
    expect(first.result).toEqual({
      classrooms: 0,
      subjects: 1,
      assessments: 1,
      students: 1,
      teachers: 1,
      fees: 1,
    });
    expect(second.alreadyApplied).toBe(true);
    expect(state.targetSubjects).toHaveLength(1);
    expect(state.assessments).toHaveLength(1);
    expect(state.studentForms).toHaveLength(1);
    expect(state.financeCharges).toHaveLength(1);
    expect(state.staffTermProfiles).toHaveLength(1);
    expect(state.classroomAssignments).toHaveLength(1);
    expect(state.grants).toHaveLength(1);
    expect(state.staffSubjects).toHaveLength(1);
    expect(state.activities).toHaveLength(1);
  });

  test("rejects an idempotency key reused with different rollover settings", async () => {
    const { ctx } = createSetupContext();
    const input = {
      ...setupInput,
      idempotencyKey: "term-target-rollover-2",
    };
    await applyAcademicTermSetup(ctx, input);

    await expect(
      applyAcademicTermSetup(ctx, {
        ...input,
        teacherOption: "empty",
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
    } satisfies Partial<TRPCError>);
  });

  test("blocks activation while the outgoing finance ledger is open", async () => {
    const { ctx } = createLifecycleContext();

    const preview = await previewAcademicTermActivation(ctx, {
      termId: "term-target",
    });

    expect(preview.canActivate).toBe(false);
    expect(preview.blockers).toContainEqual(
      expect.objectContaining({ key: "finance-ledger-open" }),
    );
  });

  test("activates a ready term and atomically closes the previous term", async () => {
    const { ctx, state } = createLifecycleContext({ financeClosed: true });

    const result = await activateAcademicTerm(ctx, {
      termId: "term-target",
    });

    expect(result.termId).toBe("term-target");
    expect(state.activeSessionTermId).toBe("term-target");
    expect(
      state.terms.find((term) => term.id === "term-source")?.lifecycleStatus,
    ).toBe("CLOSED");
    expect(
      state.terms.find((term) => term.id === "term-target")?.lifecycleStatus,
    ).toBe("ACTIVE");
    expect(state.activities).toContainEqual(
      expect.objectContaining({ type: "academic_term_activated" }),
    );
  });

  test("returns the canonical active term when activation is retried", async () => {
    const { ctx, state } = createLifecycleContext({ financeClosed: true });
    await activateAcademicTerm(ctx, { termId: "term-target" });
    const activityCount = state.activities.length;

    const result = await activateAcademicTerm(ctx, {
      termId: "term-target",
    });

    expect(result).toEqual({
      termId: "term-target",
      termTitle: "Second Term",
      sessionId: "session-1",
      sessionTitle: "2025/2026",
    });
    expect(state.activities).toHaveLength(activityCount);
  });

  test("rejects academic writes after a term is closed", async () => {
    const { ctx, state } = createLifecycleContext();
    const target = state.terms.find((term) => term.id === "term-target")!;
    target.lifecycleStatus = "CLOSED";

    await expect(
      assertAcademicTermWritable(ctx, "term-target"),
    ).rejects.toMatchObject({
      code: "CONFLICT",
    } satisfies Partial<TRPCError>);
  });

  test("closes the active academic term only after finance closure", async () => {
    const { ctx, state } = createLifecycleContext({ financeClosed: true });

    const result = await closeAcademicTerm(ctx, { termId: "term-source" });

    expect(result).toEqual({ success: true });
    expect(state.activeSessionTermId).toBeNull();
    expect(
      state.terms.find((term) => term.id === "term-source")?.lifecycleStatus,
    ).toBe("CLOSED");
    expect(state.activities).toContainEqual(
      expect.objectContaining({ type: "academic_term_closed" }),
    );
  });
});
