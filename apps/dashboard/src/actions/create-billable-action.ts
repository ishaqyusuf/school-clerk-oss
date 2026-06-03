import { actionClient } from "./safe-action";
import { createBillableSchema } from "./schema";

const resetPayload = {
	success: false,
	message: "The legacy finance module has been reset and is being rebuilt.",
};

export type CreateBillableForm = typeof createBillableSchema._type;

export async function createBillable() {
	return resetPayload;
}

export const createBillableAction = actionClient
	.schema(createBillableSchema)
	.action(async () => resetPayload);
