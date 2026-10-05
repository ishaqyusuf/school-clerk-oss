import { z } from "zod";

import { STUDENT_TERM_ADMISSION_TYPES } from "./constants";

const recordId = z.string().trim().min(1).max(128);

export const studentFeeSchema = z.object({
	feeId: z.string(),
	title: z.string().optional(),
	amount: z.number().optional(),
	paid: z.number().optional(),
	studentTermId: z.string().optional(),
	studentId: z.string().optional(),
});

export const guardianSchema = z.object({
	id: recordId.optional().nullable(),
	phone: z.string().trim().max(64).nullable(),
	phone2: z.string().trim().max(64).optional().nullable(),
	name: z.string().trim().max(200).nullable(),
});

export const createStudentObjectSchema = z.object({
	name: z.string().trim().min(1).max(200),
	surname: z.string().trim().min(1).max(200),
	otherName: z.string().trim().max(200).optional().nullable(),
	gender: z.enum(["Male", "Female"]),
	dob: z.date().nullable().optional(),
	classRoomId: recordId.nullable(),
	admissionType: z.enum(STUDENT_TERM_ADMISSION_TYPES),
	selectedOptionalFeeItemIds: z.array(recordId).max(100).optional().default([]),
	fees: z.array(studentFeeSchema).max(100).optional(),
	guardian: guardianSchema.optional().nullable(),
	termForms: z
		.array(
			z.object({
				sessionTermId: recordId,
				schoolSessionId: recordId,
			}),
		)
		.max(24)
		.optional()
		.nullable(),
	feePayments: z
		.array(
			z.object({
				feeItemId: recordId,
				amount: z.number().finite().min(0),
			}),
		)
		.max(100)
		.optional()
		.default([]),
	paymentDetails: z
		.object({
			method: z.string().trim().min(1).max(64),
			reference: z.string().trim().max(500).optional().nullable(),
			paymentDate: z.date().optional().nullable(),
		})
		.optional()
		.nullable(),
	submissionScope: z.object({
		schoolId: recordId,
		userId: recordId,
		loginSessionId: recordId,
		schoolSessionId: recordId.nullable(),
		sessionTermId: recordId.nullable(),
	}).optional(),
});

export const createStudentSchema = createStudentObjectSchema.superRefine(
	(data, ctx) => {
		if (new Set(data.termForms?.map((term) => term.sessionTermId)).size !== (data.termForms?.length ?? 0)) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["termForms"], message: "Select each academic term only once." });
		}
		if (new Set(data.selectedOptionalFeeItemIds).size !== data.selectedOptionalFeeItemIds.length) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["selectedOptionalFeeItemIds"], message: "Select each optional fee only once." });
		}
		if (data.fees?.length) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fees"], message: "Use current fee selections and payment fields instead of legacy fees." });
		}
		if (!data.classRoomId && (data.termForms?.length || data.selectedOptionalFeeItemIds.length || data.feePayments.some((payment) => payment.amount > 0))) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["classRoomId"], message: "Select a class before requesting enrollment, fees or payments." });
		}
		if (data.guardian?.phone2 && !data.guardian.id && !data.guardian.name && !data.guardian.phone) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["guardian", "name"], message: "Enter a guardian name or primary phone." });
		}
		const positivePayments = data.feePayments.filter(
			(payment) => payment.amount > 0,
		);
		const uniqueFeeItemIds = new Set(
			positivePayments.map((payment) => payment.feeItemId),
		);

		if (uniqueFeeItemIds.size !== positivePayments.length) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["feePayments"],
				message: "Each fee can only be paid once during student creation.",
			});
		}

		if (positivePayments.length > 0 && !data.paymentDetails?.method) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["paymentDetails", "method"],
				message: "Select a payment method before recording a payment.",
			});
		}
	},
);

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
