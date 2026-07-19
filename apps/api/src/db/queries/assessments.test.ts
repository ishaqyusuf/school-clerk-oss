import { describe, expect, test } from "bun:test";
import { TRPCError } from "@trpc/server";

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@127.0.0.1:55432/school_clerk";

const { saveAssessement, updateAssessmentScore, updateAssessmentScoreSchema } =
  await import("./assessments");

function createAdminContext(overrides: Record<string, unknown> = {}) {
  return {
    profile: {
      authSessionId: "session-1",
      schoolId: "school-1",
      sessionId: "session-1",
      termId: "term-1",
    },
    currentUser: {
      email: "admin@school.test",
      id: "user-1",
      name: "Admin One",
      role: "Admin",
      saasAccountId: "account-1",
    },
    db: {
      session: {
        findFirst: async () => ({
          user: {
            email: "admin@school.test",
            id: "user-1",
            name: "Admin One",
            role: "Admin",
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
      departmentSubject: {
        findFirst: async () => ({
          classRoomDepartmentId: "classroom-a",
          sessionTermId: "term-1",
        }),
      },
      ...overrides,
    },
  } as any;
}

describe("saveAssessement", () => {
  test("rejects child assessment ids that do not belong to the grouped parent", async () => {
    const tx = {
      classroomSubjectAssessment: {
        update: async () => ({ id: 10 }),
        findMany: async () => [{ id: 101 }],
      },
    };
    const ctx = createAdminContext({
      classroomSubjectAssessment: {
        findFirst: async () => ({
          departmentSubjectId: "subject-1",
          departmentSubject: { sessionTermId: "term-1" },
        }),
      },
      $transaction: async (callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
    });

    await expect(
      saveAssessement(ctx, {
        id: 10,
        title: "Exam",
        obtainable: 0,
        index: 0,
        percentageObtainable: 0,
        departmentSubjectId: "subject-1",
        isGroup: true,
        printMode: "expanded",
        parentAssessmentId: null,
        childAssessments: [
          {
            id: 999,
            title: "Oral",
            obtainable: 10,
            percentageObtainable: 20,
          },
        ],
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message:
        "One or more sub-assessments do not belong to this grouped assessment.",
    } satisfies Partial<TRPCError>);
  });
});

describe("updateAssessmentScore", () => {
  test("rejects negative, malformed, and non-finite score inputs", () => {
    const baseInput = {
      assessmentId: 10,
      departmentId: "subject-1",
      studentId: "student-1",
      studentTermId: "term-form-1",
    };

    for (const obtained of [-1, Number.NaN, Number.POSITIVE_INFINITY, "ten"]) {
      expect(
        updateAssessmentScoreSchema.safeParse({ ...baseInput, obtained })
          .success,
      ).toBe(false);
    }
  });

  test("rejects direct score writes to grouped parent assessments", async () => {
    const ctx = createAdminContext({
      classroomSubjectAssessment: {
        findFirst: async () => ({
          departmentSubjectId: "subject-1",
          departmentSubject: {
            classRoomDepartmentId: "classroom-a",
            sessionTermId: "term-1",
          },
          isGroup: true,
        }),
      },
    });

    await expect(
      updateAssessmentScore(ctx, {
        assessmentId: 10,
        departmentId: "subject-1",
        obtained: 8,
        studentId: "student-1",
        studentTermId: "term-form-1",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Scores can only be recorded against scoreable assessments.",
    } satisfies Partial<TRPCError>);
  });

  test("updates the score and persists its previous and new values in the same transaction", async () => {
    const historyRows: Record<string, unknown>[] = [];
    let transactionOptions: Record<string, unknown> | undefined;
    const tx = {
      studentAssessmentRecord: {
        findFirst: async () => ({ id: 7, obtained: 4 }),
        update: async ({
          data,
          where,
        }: {
          data: { obtained: number | null };
          where: { id: number };
        }) => ({ id: where.id, obtained: data.obtained }),
      },
      studentAssessmentRecordHistory: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          historyRows.push(data);
          return { id: "history-1" };
        },
      },
    };
    const ctx = createAdminContext({
      classroomSubjectAssessment: {
        findFirst: async () => ({
          departmentSubjectId: "subject-1",
          departmentSubject: {
            classRoomDepartmentId: "classroom-a",
            sessionTermId: "term-1",
          },
          isGroup: false,
          obtainable: null,
        }),
      },
      studentAssessmentRecord: tx.studentAssessmentRecord,
      studentAssessmentRecordHistory: tx.studentAssessmentRecordHistory,
      studentTermForm: {
        findFirst: async () => ({
          classroomDepartmentId: "classroom-a",
        }),
      },
      $transaction: async (
        callback: (transaction: typeof tx) => unknown,
        options: Record<string, unknown>,
      ) => {
        transactionOptions = options;
        return callback(tx);
      },
    });

    const result = await updateAssessmentScore(ctx, {
      id: 7,
      assessmentId: 10,
      departmentId: "subject-1",
      obtained: 9,
      studentId: "student-1",
      studentTermId: "term-form-1",
    });

    expect(result).toEqual({ id: 7, obtained: 9 });
    expect(transactionOptions).toEqual({ isolationLevel: "Serializable" });
    expect(historyRows).toEqual([
      expect.objectContaining({
        schoolProfileId: "school-1",
        studentAssessmentRecordId: 7,
        studentId: "student-1",
        studentTermFormId: "term-form-1",
        classSubjectAssessmentId: 10,
        previousObtained: 4,
        newObtained: 9,
        changeType: "UPDATE",
        source: "AUTHENTICATED_ENTRY",
        actorUserId: "user-1",
        actorName: "Admin One",
      }),
    ]);
  });

  test("rejects a score above a capped assessment maximum", async () => {
    const ctx = createAdminContext({
      classroomSubjectAssessment: {
        findFirst: async () => ({
          departmentSubjectId: "subject-1",
          departmentSubject: {
            classRoomDepartmentId: "classroom-a",
            sessionTermId: "term-1",
          },
          isGroup: false,
          obtainable: 20,
        }),
      },
    });

    await expect(
      updateAssessmentScore(ctx, {
        assessmentId: 10,
        departmentId: "subject-1",
        obtained: 21,
        studentId: "student-1",
        studentTermId: "term-form-1",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Score cannot be greater than the assessment maximum.",
    } satisfies Partial<TRPCError>);
  });

  test("retries serialization conflicts and returns a clear conflict after exhaustion", async () => {
    let attempts = 0;
    const ctx = createAdminContext({
      classroomSubjectAssessment: {
        findFirst: async () => ({
          departmentSubject: {
            classRoomDepartmentId: "classroom-a",
          },
          isGroup: false,
        }),
      },
      studentTermForm: {
        findFirst: async () => ({
          classroomDepartmentId: "classroom-a",
        }),
      },
      $transaction: async () => {
        attempts += 1;
        throw { code: "P2034" };
      },
    });

    await expect(
      updateAssessmentScore(ctx, {
        assessmentId: 10,
        departmentId: "subject-1",
        obtained: 9,
        studentId: "student-1",
        studentTermId: "term-form-1",
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message:
        "This assessment score changed at the same time. Refresh the results and try again.",
    });
    expect(attempts).toBe(3);
  });
});
