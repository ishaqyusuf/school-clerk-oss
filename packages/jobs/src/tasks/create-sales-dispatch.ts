import { createSalesDispatchSchemaTask, TaskName } from "@jobs/schema";
import { queue, schemaTask } from "@trigger.dev/sdk";

export const createSalesDispatchQueue = queue({
  concurrencyLimit: 10,
  name: "create-sales-dispatch",
});

export const example = schemaTask({
  id: "create-sales-dispatch" as TaskName,
  schema: createSalesDispatchSchemaTask,
  maxDuration: 120,
  queue: createSalesDispatchQueue,
  run: async ({}) => {
    // submit-sales-assignment.ts -> create-payroll.ts ?createPayrollAction
  },
});
