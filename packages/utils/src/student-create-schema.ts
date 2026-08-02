import { z } from "zod";

import { STUDENT_TERM_ADMISSION_TYPES } from "./constants";

export const studentFeeSchema = z.object({
	feeId: z.string(),
	title: z.string().optional(),
	amount: z.number().optional(),
	paid: z.number().optional(),
	studentTermId: z.string().optional(),
	studentId: z.string().optional(),
});

export const guardianSchema = z.object({
	id: z.string().optional().nullable(),
	phone: z.string().nullable(),
	phone2: z.string().optional().nullable(),
	name: z.string().nullable(),
});

export const createStudentObjectSchema = z.object({
	name: z.string().min(1),
	surname: z.string().min(1),
	otherName: z.string().optional().nullable(),
	gender: z.enum(["Male", "Female"]),
	dob: z.date().nullable().optional(),
	classRoomId: z.string().nullable(),
	admissionType: z.enum(STUDENT_TERM_ADMISSION_TYPES),
	selectedOptionalFeeItemIds: z.array(z.string()).optional().default([]),
	fees: z.array(studentFeeSchema).optional(),
	guardian: guardianSchema.optional().nullable(),
	termForms: z
		.array(
			z.object({
				sessionTermId: z.string(),
				schoolSessionId: z.string(),
			}),
		)
		.optional()
		.nullable(),
	feePayments: z
		.array(
			z.object({
				feeItemId: z.string().min(1),
				amount: z.number().min(0),
			}),
		)
		.optional()
		.default([]),
	paymentDetails: z
		.object({
			method: z.string().min(1),
			reference: z.string().optional().nullable(),
			paymentDate: z.date().optional().nullable(),
		})
		.optional()
		.nullable(),
});

export const createStudentSchema = createStudentObjectSchema.superRefine(
	(data, ctx) => {
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
