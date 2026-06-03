import { actionClient } from "./safe-action";
import { createSchoolFeeSchema } from "./schema";

const resetPayload = {
	success: false,
	message: "The legacy finance module has been reset and is being rebuilt.",
};

export type CreateSchoolFeeForm = typeof createSchoolFeeSchema._type;

export async function createSchoolFee(..._args: any[]) {
	return resetPayload;
}

export const createSchoolFeeAction = actionClient
	.schema(createSchoolFeeSchema)
	.action(async () => resetPayload);
