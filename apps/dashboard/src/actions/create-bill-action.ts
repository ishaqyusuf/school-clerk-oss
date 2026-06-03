import { actionClient } from "./safe-action";
import { createBillSchema } from "./schema";

const resetPayload = {
	success: false,
	message: "The legacy finance module has been reset and is being rebuilt.",
};

export type CreateForm = typeof createBillSchema._type;

export async function createBill() {
	return resetPayload;
}

export const createBillAction = actionClient
	.schema(createBillSchema)
	.action(async () => resetPayload);
