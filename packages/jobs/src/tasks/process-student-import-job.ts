import { processStudentImportJobSchema } from "../schema.js";
import { prisma, runStudentImportJob } from "@school-clerk/db";
import { processStudentImportJobTaskId } from "@school-clerk/utils/task-contracts";
import { queue, schemaTask } from "@trigger.dev/sdk";

export const processStudentImportJobQueue = queue({
  concurrencyLimit: 3,
  name: "process-student-import-job",
});

export const processStudentImportJobTask = schemaTask({
  id: processStudentImportJobTaskId,
  schema: processStudentImportJobSchema,
  maxDuration: 300,
  queue: processStudentImportJobQueue,
  run: async (payload) => {
    await runStudentImportJob(prisma, payload.jobId);
  },
});
