import type { AssessmentScoreChangeSource, Prisma } from "./generated/client";
import type { Database } from "./prisma";

type AssessmentScoreHistoryDatabase = Pick<
  Database,
  "studentAssessmentRecord" | "studentAssessmentRecordHistory"
>;

type CurrentAssessmentScoreRecord = {
  id: number;
  obtained: number | null;
};

type AssessmentScoreIdentity = {
  studentId: string;
  studentTermFormId: string;
  classSubjectAssessmentId: number;
};

type AssessmentScoreHistoryContext = {
  schoolProfileId: string;
  source: AssessmentScoreChangeSource;
  actorUserId?: string | null;
  actorName?: string | null;
  sourceReference?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export class AssessmentScoreWriteConflictError extends Error {
  constructor() {
    super(
      "This assessment score changed at the same time. Refresh the results and try again.",
    );
    this.name = "AssessmentScoreWriteConflictError";
  }
}

function isPrismaWriteConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2034"
  );
}

export async function retryAssessmentScoreHistoryTransaction<TResult>(
  operation: () => Promise<TResult>,
  maxAttempts = 3,
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isPrismaWriteConflict(error)) throw error;
      if (attempt === maxAttempts) {
        throw new AssessmentScoreWriteConflictError();
      }
    }
  }

  throw new AssessmentScoreWriteConflictError();
}

export async function saveStudentAssessmentScoreWithHistory({
  db,
  currentRecord,
  score,
  history,
}: {
  db: AssessmentScoreHistoryDatabase;
  currentRecord: CurrentAssessmentScoreRecord | null;
  score: AssessmentScoreIdentity & {
    obtained: number | null;
  };
  history: AssessmentScoreHistoryContext;
}) {
  const savedRecord = currentRecord
    ? await db.studentAssessmentRecord.update({
        where: { id: currentRecord.id },
        data: {
          obtained: score.obtained,
          deletedAt: null,
        },
        select: {
          id: true,
          obtained: true,
        },
      })
    : await db.studentAssessmentRecord.create({
        data: {
          classSubjectAssessmentId: score.classSubjectAssessmentId,
          obtained: score.obtained,
          studentId: score.studentId,
          studentTermFormId: score.studentTermFormId,
        },
        select: {
          id: true,
          obtained: true,
        },
      });

  await db.studentAssessmentRecordHistory.create({
    data: {
      schoolProfileId: history.schoolProfileId,
      studentAssessmentRecordId: savedRecord.id,
      studentId: score.studentId,
      studentTermFormId: score.studentTermFormId,
      classSubjectAssessmentId: score.classSubjectAssessmentId,
      previousObtained: currentRecord?.obtained ?? null,
      newObtained: score.obtained,
      changeType: currentRecord ? "UPDATE" : "CREATE",
      source: history.source,
      actorUserId: history.actorUserId ?? null,
      actorName: history.actorName ?? null,
      sourceReference: history.sourceReference ?? null,
      metadata: history.metadata,
    },
  });

  return savedRecord;
}
