import { describe, expect, test } from "bun:test";

import type { TRPCContext } from "@api/trpc/init";

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@127.0.0.1:55432/school_clerk";

const { updatePublicAssessmentScore } =
  await import("./assessment-public-links");
const { createAssessmentPublicLinkToken } =
  await import("./assessment-public-links-policy");

describe("updatePublicAssessmentScore history", () => {
  test("records public-link source without attributing the anonymous editor to the requester", async () => {
    const historyRows: Record<string, unknown>[] = [];
    let transactionOptions: Record<string, unknown> | undefined;
    const token = await createAssessmentPublicLinkToken("link-1");
    const tx = {
      studentAssessmentRecord: {
        findFirst: async () => ({ id: 7, obtained: 5 }),
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
    const ctx = {
      profile: {},
      db: {
        assessmentPublicLink: {
          findFirst: async () => ({
            id: "link-1",
            status: "APPROVED",
            expiresAt: new Date(Date.now() + 60_000),
            requestedDurationHours: 24,
            schoolProfileId: "school-1",
            sessionTermId: "term-1",
            classRoomDepartmentId: "classroom-1",
            selectedDepartmentSubjectIds: ["subject-1"],
            selectedStudentTermFormIds: [],
            requesterUserId: "requester-1",
            requesterName: "External Marker",
            approvedByUserId: "admin-1",
            approvedByName: "Admin One",
            createdByUserId: "admin-1",
            createdByName: "Admin One",
          }),
          update: async () => ({ id: "link-1" }),
        },
        departmentSubject: {
          findFirst: async () => ({ id: "subject-1" }),
        },
        classroomSubjectAssessment: {
          findFirst: async () => ({ id: 41, obtainable: 20 }),
        },
        studentTermForm: {
          findFirst: async () => ({ id: "term-form-1" }),
        },
        studentAssessmentRecord: tx.studentAssessmentRecord,
        studentAssessmentRecordHistory: tx.studentAssessmentRecordHistory,
        activity: {
          create: async () => ({ id: "activity-1" }),
        },
        $transaction: async (
          callback: (transaction: typeof tx) => unknown,
          options: Record<string, unknown>,
        ) => {
          transactionOptions = options;
          return callback(tx);
        },
      },
    } as unknown as TRPCContext;

    const result = await updatePublicAssessmentScore(ctx, {
      token,
      id: 7,
      assessmentId: 41,
      departmentSubjectId: "subject-1",
      obtained: 13,
      studentId: "student-1",
      studentTermId: "term-form-1",
    });

    expect(result).toEqual({ id: 7, obtained: 13 });
    expect(transactionOptions).toEqual({ isolationLevel: "Serializable" });
    expect(historyRows).toEqual([
      expect.objectContaining({
        schoolProfileId: "school-1",
        previousObtained: 5,
        newObtained: 13,
        source: "PUBLIC_LINK",
        actorUserId: null,
        actorName: "Public assessment link",
        sourceReference: "link-1",
        metadata: expect.objectContaining({
          linkRequesterUserId: "requester-1",
        }),
      }),
    ]);
  });
});
