export function buildReceivePaymentOptionsInput(
	studentId: string,
	paidForStudentTermFormId?: string | null,
) {
	return {
		studentId,
		paidForStudentTermFormId: paidForStudentTermFormId || undefined,
	};
}

export function createEmptyTermScopedPaymentSelection() {
	return {
		selectedPaymentTypeId: "",
		customPaymentTypeTitle: "",
		selectedDescriptionId: "",
		customDescriptionTitle: "",
		amountDue: "",
		amountPaid: "",
		note: "",
		receiptState: null,
	};
}

export function createPaidForTermChange(paidForStudentTermFormId: string) {
	return {
		paidForStudentTermFormId,
		...createEmptyTermScopedPaymentSelection(),
	};
}
