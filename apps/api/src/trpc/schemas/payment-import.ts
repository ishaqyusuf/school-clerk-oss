import { z } from "zod";

export const paymentImportModeSchema = z.enum(["STUDENT", "STAFF"]);
export const paymentImportTypeSchema = z.enum([
	"SCHOOL_FEE",
	"ENTRANCE_FORM",
	"BOOK",
	"UNIFORM",
	"WAGE",
]);

const paymentDateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
	.optional()
	.nullable();

export const paymentImportSourceRowSchema = z.object({
	lineNumber: z.number().int().positive(),
	paymentDate: paymentDateSchema,
	counterpartyName: z.string().trim().min(1),
	paymentType: paymentImportTypeSchema,
	amount: z.coerce.number().positive(),
	sourceNote: z.string().trim().optional().nullable(),
	counterpartyId: z.string().optional().nullable(),
	streamId: z.string().optional().nullable(),
	itemId: z.string().optional().nullable(),
	allowDuplicate: z.boolean().optional(),
	skip: z.boolean().optional(),
});

export const verifyPaymentImportSchema = z.object({
	mode: paymentImportModeSchema,
	termId: z.string().min(1),
	rows: z.array(paymentImportSourceRowSchema).min(1).max(1_000),
});

export const startPaymentImportJobSchema = z.object({
	mode: paymentImportModeSchema,
	termId: z.string().min(1),
	method: z.string().trim().optional().nullable(),
	sourceFileName: z.string().trim().optional().nullable(),
	rows: z
		.array(
			paymentImportSourceRowSchema
				.extend({
					paymentDate: paymentDateSchema,
				})
				.superRefine((row, ctx) => {
					if (row.skip) return;
					if (!row.paymentDate) {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							path: ["paymentDate"],
							message: "Payment date is required",
						});
					}
					if (!row.counterpartyId) {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							path: ["counterpartyId"],
							message: "Matched person is required",
						});
					}
					if (!row.streamId) {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							path: ["streamId"],
							message: "Finance account is required",
						});
					}
				}),
		)
		.min(1)
		.max(1_000),
});

export const getPaymentImportJobSchema = z
	.object({
		jobId: z.string().optional(),
	})
	.optional();

export const retryPaymentImportJobSchema = z.object({
	jobId: z.string().min(1),
});

export type PaymentImportSourceRow = z.infer<
	typeof paymentImportSourceRowSchema
>;
export type VerifyPaymentImportInput = z.infer<
	typeof verifyPaymentImportSchema
>;
export type StartPaymentImportJobInput = z.infer<
	typeof startPaymentImportJobSchema
>;
