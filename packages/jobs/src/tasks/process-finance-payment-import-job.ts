import { processFinancePaymentImportJobTaskId } from "@school-clerk/utils/task-contracts";
import { queue, schemaTask } from "@trigger.dev/sdk";
import { processFinancePaymentImportJob } from "../../../../apps/api/src/db/queries/payment-import.js";
import { prisma } from "../../../db/src/prisma.js";
import { processFinancePaymentImportJobSchema } from "../schema.js";

export const processFinancePaymentImportJobQueue = queue({
	concurrencyLimit: 3,
	name: "process-finance-payment-import-job",
});

export const processFinancePaymentImportJobTask = schemaTask({
	id: processFinancePaymentImportJobTaskId,
	schema: processFinancePaymentImportJobSchema,
	maxDuration: 300,
	queue: processFinancePaymentImportJobQueue,
	run: async (payload) => {
		await processFinancePaymentImportJob(prisma, payload.jobId);
	},
});
