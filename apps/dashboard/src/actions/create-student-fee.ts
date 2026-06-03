import { actionClient } from "./safe-action";
import { studentFeeSchema } from "./schema";

const resetPayload = {
	id: "",
	feeTitle: "",
	description: "",
	studentTermForm: null,
	success: false,
	message: "The legacy student fee module has been reset and is being rebuilt.",
};

export type Type = typeof studentFeeSchema._type;

export async function createStudentFee(..._args: any[]) {
	return resetPayload;
}

export const createStudentFeeAction = actionClient
	.schema(studentFeeSchema)
	.action(async () => resetPayload);
