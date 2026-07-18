import { describe, expect, test } from "bun:test";

import { saveStudentAssessmentScoreWithHistory } from "./assessment-score-history";

function createDatabase() {
  const scoreCreates: unknown[] = [];
  const scoreUpdates: unknown[] = [];
  const historyCreates: unknown[] = [];

  return {
    db: {
      studentAssessmentRecord: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          scoreCreates.push(data);
          return { id: 17, obtained: data.obtained as number | null };
        },
        update: async ({
          data,
          where,
        }: {
          data: Record<string, unknown>;
          where: { id: number };
        }) => {
          scoreUpdates.push({ data, where });
          return { id: where.id, obtained: data.obtained as number | null };
        },
      },
      studentAssessmentRecordHistory: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          historyCreates.push(data);
          return { id: "history-1" };
        },
      },
    },
    historyCreates,
    scoreCreates,
    scoreUpdates,
  };
}

const scoreIdentity = {
  studentId: "student-1",
  studentTermFormId: "term-form-1",
  classSubjectAssessmentId: 41,
};

describe("saveStudentAssessmentScoreWithHistory", () => {
  test("creates a score and its tenant-scoped history atomically through one database boundary", async () => {
    const { db, historyCreates, scoreCreates } = createDatabase();

    const result = await saveStudentAssessmentScoreWithHistory({
      db: db as never,
      currentRecord: null,
      score: {
        ...scoreIdentity,
        obtained: 12,
      },
      history: {
        schoolProfileId: "school-1",
        source: "AUTHENTICATED_ENTRY",
        actorUserId: "user-1",
        actorName: "Admin One",
      },
    });

    expect(result).toEqual({ id: 17, obtained: 12 });
    expect(scoreCreates).toEqual([
      {
        ...scoreIdentity,
        obtained: 12,
      },
    ]);
    expect(historyCreates).toEqual([
      {
        schoolProfileId: "school-1",
        studentAssessmentRecordId: 17,
        ...scoreIdentity,
        previousObtained: null,
        newObtained: 12,
        changeType: "CREATE",
        source: "AUTHENTICATED_ENTRY",
        actorUserId: "user-1",
        actorName: "Admin One",
        sourceReference: null,
        metadata: undefined,
      },
    ]);
  });

  test("updates a score and records the previous and new values", async () => {
    const { db, historyCreates, scoreUpdates } = createDatabase();

    const result = await saveStudentAssessmentScoreWithHistory({
      db: db as never,
      currentRecord: {
        id: 17,
        obtained: 4,
      },
      score: {
        ...scoreIdentity,
        obtained: 9,
      },
      history: {
        schoolProfileId: "school-1",
        source: "WORKBOOK_IMPORT",
        actorUserId: "user-2",
        actorName: "Teacher Two",
        sourceReference: "export-1",
        metadata: { idempotencyKey: "import-key" },
      },
    });

    expect(result).toEqual({ id: 17, obtained: 9 });
    expect(scoreUpdates).toEqual([
      {
        where: { id: 17 },
        data: {
          obtained: 9,
          deletedAt: null,
        },
      },
    ]);
    expect(historyCreates).toEqual([
      {
        schoolProfileId: "school-1",
        studentAssessmentRecordId: 17,
        ...scoreIdentity,
        previousObtained: 4,
        newObtained: 9,
        changeType: "UPDATE",
        source: "WORKBOOK_IMPORT",
        actorUserId: "user-2",
        actorName: "Teacher Two",
        sourceReference: "export-1",
        metadata: { idempotencyKey: "import-key" },
      },
    ]);
  });

  test("records same-value saves and explicit score clears", async () => {
    const { db, historyCreates } = createDatabase();

    await saveStudentAssessmentScoreWithHistory({
      db: db as never,
      currentRecord: {
        id: 17,
        obtained: 9,
      },
      score: {
        ...scoreIdentity,
        obtained: 9,
      },
      history: {
        schoolProfileId: "school-1",
        source: "AUTHENTICATED_ENTRY",
      },
    });
    await saveStudentAssessmentScoreWithHistory({
      db: db as never,
      currentRecord: {
        id: 17,
        obtained: 9,
      },
      score: {
        ...scoreIdentity,
        obtained: null,
      },
      history: {
        schoolProfileId: "school-1",
        source: "AUTHENTICATED_ENTRY",
      },
    });

    expect(historyCreates).toEqual([
      expect.objectContaining({
        previousObtained: 9,
        newObtained: 9,
        changeType: "UPDATE",
      }),
      expect.objectContaining({
        previousObtained: 9,
        newObtained: null,
        changeType: "UPDATE",
      }),
    ]);
  });
});
