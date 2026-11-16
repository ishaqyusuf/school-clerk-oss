import { z } from "zod";

const name = z.string().trim().min(1).max(160);
const id = z.string().min(1).max(191);
const date = z.string().date();
export const assistantMoney = z
	.union([z.number(), z.string().trim().max(24)])
	.transform((value) => {
		if (typeof value === "number") return value;
		const normalized = value
			.replace(/[٠-٩۰-۹]/g, (digit) =>
				String(digit.charCodeAt(0) - (digit >= "۰" ? 0x06f0 : 0x0660)),
			)
			.replace(/[٬,\s]/g, "")
			.replace("٫", ".");
		return /^\d+(?:\.\d{1,2})?$/.test(normalized)
			? Number(normalized)
			: Number.NaN;
	})
	.pipe(
		z
			.number()
			.finite()
			.positive()
			.max(1_000_000_000)
			.refine(
				(amount) => Math.abs(amount * 100 - Math.round(amount * 100)) < 0.0001,
			),
	);

const paymentDetails = {
	method: z.enum(["Bank Transfer", "Cash", "Cheque"]).optional(),
	date: date.optional(),
	reference: z.string().trim().min(1).max(120).optional(),
};

export const studentPaymentDraft = z
	.object({
		students: z
			.array(
				z
					.object({
						name,
						amount: assistantMoney,
						fee: z.string().trim().max(120).optional(),
					})
					.strict(),
			)
			.min(1)
			.max(12),
		transferTotal: assistantMoney.optional(),
		...paymentDetails,
	})
	.strict();

export const salaryDraft = z
	.object({
		name,
		amount: assistantMoney,
		...paymentDetails,
	})
	.strict();

export const transferDraft = z
	.object({
		from: name.optional(),
		to: name.optional(),
		amount: assistantMoney,
		note: z.string().trim().max(200).optional(),
	})
	.strict();

export const registrationDraft = z
	.object({
		name,
		givenName: name.optional(),
		surname: name.optional(),
		otherName: name.optional(),
		classroom: name.optional(),
		fees: z
			.array(z.object({ name, amount: assistantMoney }).strict())
			.max(10)
			.default([]),
		admissionType: z
			.enum(["NEW_ADMISSION", "RETURNING", "UNCLASSIFIED"])
			.optional(),
		...paymentDetails,
	})
	.strict();

export const correctionDraft = z
	.object({
		name,
		givenName: name.optional(),
		surname: name.optional(),
		otherName: name.optional(),
	})
	.strict();

export const collectionsQuery = z
	.object({
		period: z.enum(["today", "current_term", "previous_term", "date_range"]),
		from: date.optional(),
		to: date.optional(),
	})
	.strict();

const candidate = z.object({
	id,
	name,
	detail: z.string().nullable().optional(),
});
const candidates = z.array(candidate).max(12);

export const accountActionCard = z.discriminatedUnion("action", [
	studentPaymentDraft.extend({
		action: z.literal("student_payment"),
		matches: z.array(candidates).max(12),
	}),
	salaryDraft.extend({
		action: z.literal("staff_payment"),
		matches: candidates,
	}),
	transferDraft.extend({
		action: z.literal("transfer"),
		fromId: id.optional(),
		toId: id.optional(),
	}),
	registrationDraft.extend({
		action: z.literal("register_student"),
		classroomId: id.optional(),
	}),
	correctionDraft.extend({
		action: z.literal("correct_student"),
		matches: candidates,
	}),
]);

type AccountPerson = { id: string; name: string; detail?: string | null };
type PaymentHints = {
	method?: "Bank Transfer" | "Cash" | "Cheque";
	date?: string;
	reference?: string;
};
export type AssistantAccountAction =
	| (PaymentHints & {
			action: "student_payment";
			students: { name: string; amount: number; fee?: string }[];
			matches: AccountPerson[][];
			transferTotal?: number;
	  })
	| (PaymentHints & {
			action: "staff_payment";
			name: string;
			amount: number;
			matches: AccountPerson[];
	  })
	| {
			action: "transfer";
			from?: string;
			to?: string;
			amount: number;
			note?: string;
			fromId?: string;
			toId?: string;
	  }
	| (PaymentHints & {
			action: "register_student";
			name: string;
			givenName?: string;
			surname?: string;
			otherName?: string;
			classroom?: string;
			classroomId?: string;
			fees: { name: string; amount: number }[];
			admissionType?: "NEW_ADMISSION" | "RETURNING" | "UNCLASSIFIED";
	  })
	| {
			action: "correct_student";
			name: string;
			givenName?: string;
			surname?: string;
			otherName?: string;
			matches: AccountPerson[];
	  };

export function parseAccountActionCard(
	value: unknown,
): AssistantAccountAction | null {
	const result = accountActionCard.safeParse(value);
	return result.success ? (result.data as AssistantAccountAction) : null;
}

const submittedPayment = {
	method: paymentDetails.method,
	date: paymentDetails.date,
	reference: paymentDetails.reference,
};

export const accountActionSubmission = z.discriminatedUnion("action", [
	z
		.object({
			action: z.literal("student_payment"),
			lines: z
				.array(
					z
						.object({ studentId: id, chargeId: id, amount: assistantMoney })
						.strict(),
				)
				.min(1)
				.max(24),
			...submittedPayment,
		})
		.strict(),
	z
		.object({
			action: z.literal("staff_payment"),
			staffId: id,
			chargeId: id.optional(),
			streamId: id.optional(),
			amount: assistantMoney,
			...submittedPayment,
		})
		.strict(),
	z
		.object({
			action: z.literal("transfer"),
			fromId: id,
			toId: id,
			amount: assistantMoney,
			note: z.string().trim().min(1).max(200),
		})
		.strict(),
]);

export const moneyDraftToolNames = {
	student_payment: "prepareStudentCollection",
	staff_payment: "prepareStaffSalary",
	transfer: "prepareAccountTransfer",
} as const;
