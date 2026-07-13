import { z } from "zod";

const nullableString = z.string().optional().nullable();
const money = z.coerce.number().nonnegative();

export const financeAccountTypeSchema = z.enum(["CREDIT", "DEBIT"]);
export const financeItemTypeSchema = z.enum([
	"TUITION_FEE",
	"BOOK",
	"SERVICE",
	"SALARY",
	"OTHER",
]);
export const financePayerTypeSchema = z.enum(["STUDENT", "STAFF", "SCHOOL"]);
export const financePayeeTypeSchema = z.enum([
	"VENDOR",
	"CASUAL_WORKER",
	"SERVICE_PROVIDER",
	"STAFF",
	"OTHER",
]);
export const financePayrollCadenceSchema = z.enum([
	"MONTHLY",
	"TERM",
	"DAILY",
	"HOURLY",
	"TASK",
	"ONE_OFF",
]);
export const financePurchaseKindSchema = z.enum([
	"PURCHASE",
	"SERVICE",
	"VENDOR_BILL",
	"DIRECT_EXPENSE",
	"REIMBURSEMENT",
	"LABOR",
]);

export const financeStreamInputSchema = z.object({
	id: nullableString,
	name: z.string().min(1),
	slug: nullableString,
	accountType: financeAccountTypeSchema,
	description: nullableString,
	isSystem: z.boolean().optional(),
});

export const financeItemInputSchema = z.object({
	id: nullableString,
	streamId: nullableString,
	streamName: nullableString,
	accountType: financeAccountTypeSchema.optional(),
	type: financeItemTypeSchema.default("OTHER"),
	name: z.string().min(1),
	description: nullableString,
	amount: money,
	collectable: z.boolean().optional(),
	isActive: z.boolean().optional(),
	sessionId: nullableString,
	termId: nullableString,
	classRoomDepartmentIds: z.array(z.string()).optional().default([]),
});

export const financeChargeInputSchema = z.object({
	id: nullableString,
	itemId: nullableString,
	streamId: nullableString,
	streamName: nullableString,
	type: financeItemTypeSchema.optional(),
	payerType: financePayerTypeSchema,
	studentId: nullableString,
	studentTermFormId: nullableString,
	staffProfileId: nullableString,
	staffTermProfileId: nullableString,
	payeeId: nullableString,
	payrollStructureId: nullableString,
	classroomDepartmentId: nullableString,
	sessionId: nullableString,
	termId: nullableString,
	title: z.string().min(1),
	description: nullableString,
	amount: money,
	collectionStatus: z
		.enum(["NOT_REQUIRED", "NOT_COLLECTED", "COLLECTED"])
		.optional(),
	dueDate: z.coerce.date().optional().nullable(),
});

export const financePaymentInputSchema = z.object({
	chargeId: z.string(),
	amount: money,
	paymentDate: z.coerce.date().optional().nullable(),
	method: nullableString,
	reference: nullableString,
	note: nullableString,
	receivedById: nullableString,
	collectedTermId: nullableString,
	collectedSessionId: nullableString,
});

export const financeTransferInputSchema = z.object({
	fromStreamId: z.string(),
	toStreamId: z.string(),
	amount: money,
	note: nullableString,
	sentById: nullableString,
});

export const financeSearchInputSchema = z
	.object({
		q: nullableString,
		query: nullableString,
	})
	.optional();

export const financeStreamQuerySchema = z
	.object({
		filter: z.enum(["term", "session"]).optional(),
		termId: nullableString,
		sessionId: nullableString,
	})
	.optional();

export const financeStreamDetailsSchema = z.object({
	streamId: z.string(),
	termId: nullableString,
	sessionId: nullableString,
});

export const financeStudentQuerySchema = z.object({
	studentId: z.string(),
	termId: nullableString,
	sessionId: nullableString,
});

export const financeStudentQueryCompatSchema = financeStudentQuerySchema
	.partial({
		termId: true,
		sessionId: true,
	})
	.passthrough();

export const financeReceivePaymentOptionsSchema = financeStudentQuerySchema
	.partial({
		termId: true,
		sessionId: true,
	})
	.passthrough();

export const financeSimpleStudentPaymentInputSchema = z.object({
	studentId: z.string(),
	studentTermFormId: nullableString,
	chargeId: nullableString,
	itemId: nullableString,
	streamId: nullableString,
	streamName: nullableString,
	paymentTypeTitle: z.string().optional().nullable(),
	descriptionTitle: z.string().optional().nullable(),
	description: nullableString,
	amountDue: z.coerce.number().nonnegative().optional().nullable(),
	amountPaid: z.coerce.number().positive(),
	method: nullableString,
	paymentDate: z.coerce.date().optional().nullable(),
	reference: nullableString,
	note: nullableString,
	termId: nullableString,
	sessionId: nullableString,
});

export const financeTermLedgerQuerySchema = z
	.object({
		termId: nullableString,
		sessionId: nullableString,
	})
	.optional();

export const financeTermAccountStatementSchema = z.object({
	streamId: z.string(),
	termId: nullableString,
	sessionId: nullableString,
});

export const financeTermCloseSchema = z
	.object({
		termId: nullableString,
		sessionId: nullableString,
		nextTermId: nullableString,
	})
	.optional();

export const financePayeeInputSchema = z.object({
	id: nullableString,
	name: z.string().min(1),
	type: financePayeeTypeSchema.default("OTHER"),
	phone: nullableString,
	email: nullableString,
	note: nullableString,
});

export const financePayeeQuerySchema = z
	.object({
		q: nullableString,
		type: financePayeeTypeSchema.optional().nullable(),
	})
	.optional();

export const financePayrollStructureInputSchema = z.object({
	id: nullableString,
	staffProfileId: nullableString,
	streamId: nullableString,
	streamName: nullableString,
	title: z.string().min(1),
	cadence: financePayrollCadenceSchema.default("MONTHLY"),
	baseAmount: money,
	allowanceAmount: money.optional().default(0),
	deductionAmount: money.optional().default(0),
	advanceAmount: money.optional().default(0),
	bonusAmount: money.optional().default(0),
	roleLabel: nullableString,
	isActive: z.boolean().optional(),
	sessionId: nullableString,
	termId: nullableString,
	notes: nullableString,
});

export const financePayrollObligationInputSchema = z.object({
	payrollStructureId: z.string(),
	title: nullableString,
	description: nullableString,
	amount: z.coerce.number().nonnegative().optional().nullable(),
	dueDate: z.coerce.date().optional().nullable(),
	sessionId: nullableString,
	termId: nullableString,
});

export const financePurchaseInputSchema = z.object({
	id: nullableString,
	kind: financePurchaseKindSchema.default("PURCHASE"),
	streamId: nullableString,
	streamName: nullableString,
	payeeId: nullableString,
	payeeName: nullableString,
	payeeType: financePayeeTypeSchema.optional().nullable(),
	title: z.string().min(1),
	description: nullableString,
	quantity: z.coerce.number().positive().optional().default(1),
	unitCost: money.optional().default(0),
	totalCost: z.coerce.number().nonnegative().optional().nullable(),
	amountPaid: z.coerce.number().nonnegative().optional().default(0),
	method: nullableString,
	paymentDate: z.coerce.date().optional().nullable(),
	receiptNumber: nullableString,
	reference: nullableString,
	note: nullableString,
	sessionId: nullableString,
	termId: nullableString,
});

export const financePurchaseCancellationSchema = z.object({
	purchaseId: z.string(),
	reason: z.string().min(1),
});

export const financeProjectAccountSummarySchema = z.object({
	streamId: z.string(),
	termId: nullableString,
	sessionId: nullableString,
});

export const financeStaffHistorySchema = z.object({
	staffProfileId: z.string(),
	termId: nullableString,
	sessionId: nullableString,
});

export const financePayeeHistorySchema = z.object({
	payeeId: z.string(),
	termId: nullableString,
	sessionId: nullableString,
});

export type FinanceStreamInput = z.infer<typeof financeStreamInputSchema>;
export type FinanceItemInput = z.infer<typeof financeItemInputSchema>;
export type FinanceChargeInput = z.infer<typeof financeChargeInputSchema>;
export type FinancePaymentInput = z.infer<typeof financePaymentInputSchema>;
export type FinanceTransferInput = z.infer<typeof financeTransferInputSchema>;
export type FinanceStreamQuery = z.infer<typeof financeStreamQuerySchema>;
export type FinanceStreamDetailsInput = z.infer<
	typeof financeStreamDetailsSchema
>;
export type FinanceStudentQuery = z.infer<typeof financeStudentQuerySchema>;
export type FinanceReceivePaymentOptionsInput = z.infer<
	typeof financeReceivePaymentOptionsSchema
>;
export type FinanceSimpleStudentPaymentInput = z.infer<
	typeof financeSimpleStudentPaymentInputSchema
>;
export type FinanceTermLedgerQuery = z.infer<
	typeof financeTermLedgerQuerySchema
>;
export type FinanceTermAccountStatementInput = z.infer<
	typeof financeTermAccountStatementSchema
>;
export type FinanceTermCloseInput = z.infer<typeof financeTermCloseSchema>;
export type FinancePayeeInput = z.infer<typeof financePayeeInputSchema>;
export type FinancePayeeQuery = z.infer<typeof financePayeeQuerySchema>;
export type FinancePayrollStructureInput = z.infer<
	typeof financePayrollStructureInputSchema
>;
export type FinancePayrollObligationInput = z.infer<
	typeof financePayrollObligationInputSchema
>;
export type FinancePurchaseInput = z.infer<typeof financePurchaseInputSchema>;
export type FinancePurchaseCancellationInput = z.infer<
	typeof financePurchaseCancellationSchema
>;
export type FinanceProjectAccountSummaryInput = z.infer<
	typeof financeProjectAccountSummarySchema
>;
export type FinanceStaffHistoryInput = z.infer<typeof financeStaffHistorySchema>;
export type FinancePayeeHistoryInput = z.infer<typeof financePayeeHistorySchema>;
