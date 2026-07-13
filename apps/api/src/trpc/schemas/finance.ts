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
	type: financeItemTypeSchema.optional(),
	payerType: financePayerTypeSchema,
	studentId: nullableString,
	studentTermFormId: nullableString,
	staffProfileId: nullableString,
	staffTermProfileId: nullableString,
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

export const financeTermLedgerQuerySchema = z
	.object({
		termId: nullableString,
		sessionId: nullableString,
	})
	.optional();

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
export type FinanceTermLedgerQuery = z.infer<
	typeof financeTermLedgerQuerySchema
>;
