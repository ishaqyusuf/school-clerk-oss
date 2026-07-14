import { processStudentImportJobSchema } from "../schema.js";
import { processStudentImportJob } from "../../../../apps/api/src/db/queries/students.js";
import { prisma } from "../../../db/src/prisma.js";
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
    await processStudentImportJob(prisma, payload.jobId);
  },
});
