import { actionClient } from "./safe-action";
import { studentFeePaymentSchema } from "./schema";

const resetPayload = {
	success: false,
	message: "The legacy student fee payment module has been reset and is being rebuilt.",
};

export type CreateClassRoom = typeof studentFeePaymentSchema._type;

export async function createStudentFeePayment(..._args: any[]) {
	return resetPayload;
}

export const createStudentFeePaymentAction = actionClient
	.schema(studentFeePaymentSchema)
	.action(async () => resetPayload);
