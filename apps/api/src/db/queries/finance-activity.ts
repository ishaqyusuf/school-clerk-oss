import { recordActivity } from "@school-clerk/db";
import {
	activityNaira,
	activityStudentRef,
	activityTermRef,
} from "@school-clerk/utils/activity-refs";
import type { TRPCContext } from "../../trpc/init";

/*
 * Student payment activity (ADR-0093). A cashier action can post several
 * FinancePayment rows at once (one per fee line); it is recorded as one
 * `student_payment_received` activity per student with the receipt total and
 * the fee names. Staff, payee and school payments never record one.
 */

export type StudentPaymentActivityDb = Pick<
	TRPCContext["db"],
	"financePayment" | "activity"
>;

const PURPOSE_TITLE_LIMIT = 3;

function round2(value: number) {
	return Math.round(value * 100) / 100;
}

function paymentPurpose(titles: Array<string | null | undefined>) {
	const unique = [
		...new Set(titles.map((title) => title?.trim()).filter(Boolean)),
	] as string[];
	if (!unique.length) return null;
	const shown = unique.slice(0, PURPOSE_TITLE_LIMIT).join(", ");
	const hidden = unique.length - PURPOSE_TITLE_LIMIT;
	return hidden > 0 ? `${shown} +${hidden} more` : shown;
}

function actor(ctx: TRPCContext) {
	return {
		userId: ctx.currentUser?.id ?? "system",
		author: ctx.currentUser?.name ?? "School Clerk user",
	};
}

/**
 * Record `student_payment_received` for payments posted together. Call it
 * inside the transaction that created the payments.
 */
export async function recordStudentPaymentReceivedActivity(
	ctx: TRPCContext,
	db: StudentPaymentActivityDb,
	paymentIds: string[],
) {
	const schoolProfileId = ctx.profile.schoolId;
	if (!schoolProfileId || !paymentIds.length) return [];
	const payments = await db.financePayment.findMany({
		where: {
			id: { in: paymentIds },
			schoolProfileId,
			payerType: "STUDENT",
			studentId: { not: null },
		},
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: {
			id: true,
			amount: true,
			method: true,
			reference: true,
			studentId: true,
			student: {
				select: { id: true, name: true, surname: true, otherName: true },
			},
			collectedSessionTerm: {
				select: { id: true, title: true, session: { select: { title: true } } },
			},
			allocations: { select: { charge: { select: { title: true } } } },
		},
	});
	type StudentPayment = (typeof payments)[number] & {
		student: NonNullable<(typeof payments)[number]["student"]>;
	};
	const byStudent = new Map<string, StudentPayment[]>();
	for (const payment of payments) {
		const { student } = payment;
		if (!payment.studentId || !student) continue;
		const group = byStudent.get(payment.studentId) ?? [];
		group.push({ ...payment, student });
		byStudent.set(payment.studentId, group);
	}

	const { userId, author } = actor(ctx);
	const recorded: Array<{ id: string }> = [];
	for (const group of byStudent.values()) {
		const [first] = group;
		if (!first) continue;
		const student = activityStudentRef(
			first.student,
			ctx.profile.studentNameFormat,
		);
		const amount = round2(
			group.reduce((sum, payment) => sum + Number(payment.amount), 0),
		);
		const purpose = paymentPurpose(
			group.flatMap((payment) =>
				payment.allocations.map((allocation) => allocation.charge?.title),
			),
		);
		recorded.push(
			await recordActivity(db, {
				schoolId: schoolProfileId,
				type: "student_payment_received",
				userId,
				author,
				title: "Payment received",
				description: `${author} received ${activityNaira(amount)} from ${student.name}${purpose ? ` for ${purpose}` : ""}.`,
				meta: {
					paymentId: first.id,
					student,
					amount,
					currency: "NGN",
					method: first.method ?? null,
					reference: first.reference ?? null,
					purpose,
					term: activityTermRef(first.collectedSessionTerm),
				},
				subject: { type: "payment", id: first.id },
			}),
		);
	}
	return recorded;
}

/** Best-effort variant for flows that post payments in several transactions. */
export async function recordStudentPaymentReceivedActivitySafely(
	ctx: TRPCContext,
	db: StudentPaymentActivityDb,
	paymentIds: string[],
) {
	try {
		return await recordStudentPaymentReceivedActivity(ctx, db, paymentIds);
	} catch (error) {
		console.error(
			"[activity] failed to record student_payment_received",
			error,
		);
		return [];
	}
}

/** Record `student_payment_reversed` inside the reversal transaction. */
export async function recordStudentPaymentReversedActivity(
	ctx: TRPCContext,
	db: Pick<TRPCContext["db"], "activity">,
	payment: {
		id: string;
		amount: unknown;
		method?: string | null;
		student: {
			id: string;
			name?: string | null;
			surname?: string | null;
			otherName?: string | null;
		};
	},
	reason?: string | null,
) {
	const schoolProfileId = ctx.profile.schoolId;
	if (!schoolProfileId) return null;
	const { userId, author } = actor(ctx);
	const student = activityStudentRef(
		payment.student,
		ctx.profile.studentNameFormat,
	);
	const amount = round2(Number(payment.amount));
	return recordActivity(db, {
		schoolId: schoolProfileId,
		type: "student_payment_reversed",
		userId,
		author,
		title: "Payment reversed",
		description: `${author} reversed ${activityNaira(amount)} received from ${student.name}${reason ? `: ${reason}` : "."}`,
		meta: {
			paymentId: payment.id,
			student,
			amount,
			currency: "NGN",
			method: payment.method ?? null,
			reason: reason?.trim() || null,
		},
		subject: { type: "payment", id: payment.id },
	});
}
