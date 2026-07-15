import { describe, expect, test } from "bun:test";
import { TRPCError } from "@trpc/server";

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@127.0.0.1:55432/school_clerk";

const { saveAssessement, updateAssessmentScore } = await import("./assessments");

function createAdminContext(overrides: Record<string, unknown> = {}) {
  return {
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
});
