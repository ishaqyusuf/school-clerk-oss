import { processStudentImportJobSchema } from "../schema.js";
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
    const dbModulePath = "../../../db/src/prisma.js";
    const importModulePath = "../../../../apps/api/src/db/queries/students.js";
    const [{ prisma }, { processStudentImportJob }] = await Promise.all([
      import(dbModulePath),
      import(importModulePath),
    ]);

    await processStudentImportJob(prisma, payload.jobId);
  },
});
