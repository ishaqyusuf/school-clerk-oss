import { processStudentImportJobSchema } from "../schema.js";
import { prisma, runStudentImportJob } from "@school-clerk/db";
import { processStudentImportJobTaskId } from "@school-clerk/utils/task-contracts";
import { queue, schemaTask } from "@trigger.dev/sdk";

const MAX_DURATION_SECONDS = 300;
// Stop starting new rows well before maxDuration; one row can take a few seconds under load.
const ROW_BUDGET_MS = 240_000;

export const processStudentImportJobQueue = queue({
  concurrencyLimit: 3,
  name: "process-student-import-job",
});

export const processStudentImportJobTask = schemaTask({
  id: processStudentImportJobTaskId,
  schema: processStudentImportJobSchema,
  maxDuration: MAX_DURATION_SECONDS,
  queue: processStudentImportJobQueue,
  run: async (payload) => {
    const result = await runStudentImportJob(prisma, payload.jobId, {
      deadline: Date.now() + ROW_BUDGET_MS,
    });

    // Large jobs continue in a fresh run; the job stays RUNNING and resumes from its pending rows.
    if (result.hasPendingRows) {
      await processStudentImportJobTask.trigger(
        { jobId: payload.jobId },
        { idempotencyKey: `${payload.jobId}:${result.job.processedRows}` },
      );
    }

    return {
      jobId: payload.jobId,
      processedRows: result.job.processedRows,
      totalRows: result.job.totalRows,
      continued: result.hasPendingRows,
    };
  },
});
