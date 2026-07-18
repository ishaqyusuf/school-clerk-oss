import {
  AssessmentScoreWriteConflictError,
  retryAssessmentScoreHistoryTransaction,
} from "@school-clerk/db";
import { TRPCError } from "@trpc/server";

export async function runAssessmentScoreTransactionWithRetry<TResult>(
  operation: () => Promise<TResult>,
) {
  try {
    return await retryAssessmentScoreHistoryTransaction(operation);
  } catch (error) {
    if (error instanceof AssessmentScoreWriteConflictError) {
      throw new TRPCError({
        code: "CONFLICT",
        message: error.message,
        cause: error,
      });
    }
    throw error;
  }
}
