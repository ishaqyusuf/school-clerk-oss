export {
	applyPaymentSchema,
	cancelStudentFeeSchema,
	cancelStudentPaymentSchema,
	createSchoolFeeSchema,
	createStudentFeeSchema,
} from "@school-clerk/assessment-results";

const resetPayload = {
	success: false,
	message: "The legacy accounting module has been reset and is being rebuilt.",
};

export async function applyPayment() {
	return resetPayload;
}

export async function cancelStudentFee() {
	return resetPayload;
}

export async function cancelStudentPayment() {
	return resetPayload;
}

export async function createSchoolFee() {
	return resetPayload;
}

export async function createStudentFee() {
	return resetPayload;
}

export async function getStudentAccounting() {
	return {
		...resetPayload,
		fees: [],
		transactions: [],
		pendingFee: 0,
	};
}

export async function getTermFees() {
	return {
		...resetPayload,
		activeFees: [],
		activatableFees: [],
	};
}
