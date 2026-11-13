import { z } from "zod";

/**
 * Student withdrawal eligibility rules (ADR-0091).
 *
 * A withdrawal period starts after `lastEnrolledDate` and stays open until a
 * readmission closes it. Dates are calendar days captured as local-midnight
 * instants, the same way academic term dates are stored.
 *
 * A term is blocked for new enrollment when a period covers it:
 * - it is not the withdrawal term itself (that term is history, the student
 *   attended it up to the last enrolled day);
 * - it starts after the last enrolled day, or is still unscheduled (unscheduled
 *   drafts are treated as future terms);
 * - and the period has not been closed by a readmission at or before that term
 *   (the readmission term, and terms starting on or after the readmission date,
 *   are eligible again).
 */

export type StudentWithdrawalPeriod = {
	id: string;
	withdrawalTermId: string;
	lastEnrolledDate: Date;
	readmissionTermId: string | null;
	readmittedOn: Date | null;
};

export type EligibilityTerm = {
	id: string;
	startDate: Date | null;
};

export type StudentTermEligibility =
	| { eligible: true }
	| { eligible: false; withdrawalId: string; reason: "WITHDRAWN" };

const DAY_MS = 24 * 60 * 60 * 1000;

function time(value: Date | string) {
	return new Date(value).getTime();
}

/** The first instant at which the student is no longer attending. */
export function withdrawalEffectiveFrom(period: Pick<StudentWithdrawalPeriod, "lastEnrolledDate">) {
	return new Date(time(period.lastEnrolledDate) + DAY_MS);
}

export function isWithdrawalOpen(period: Pick<StudentWithdrawalPeriod, "readmittedOn">) {
	return !period.readmittedOn;
}

export function withdrawalCoversTerm(period: StudentWithdrawalPeriod, term: EligibilityTerm) {
	if (term.id === period.withdrawalTermId) return false;
	const start = term.startDate ? time(term.startDate) : Number.POSITIVE_INFINITY;
	if (start <= time(period.lastEnrolledDate)) return false;
	if (period.readmittedOn) {
		if (term.id === period.readmissionTermId) return false;
		if (start >= time(period.readmittedOn)) return false;
	}
	return true;
}

export function evaluateStudentTermEligibility(
	periods: readonly StudentWithdrawalPeriod[],
	term: EligibilityTerm,
): StudentTermEligibility {
	const blocking = periods.find((period) => withdrawalCoversTerm(period, term));
	return blocking ? { eligible: false, withdrawalId: blocking.id, reason: "WITHDRAWN" } : { eligible: true };
}

/** Whether the student is attending on a given instant. */
export function isStudentActiveOn(periods: readonly StudentWithdrawalPeriod[], at: Date) {
	const instant = at.getTime();
	return !periods.some((period) => {
		if (instant < withdrawalEffectiveFrom(period).getTime()) return false;
		return !period.readmittedOn || instant < time(period.readmittedOn);
	});
}

/**
 * Whether the student belongs on a term's active roster. Students covered by a
 * withdrawal are excluded; in an open (not closed) term the student is also
 * excluded once the roster date passes their last enrolled day. Closed terms
 * keep their historical roster.
 */
export function isStudentOnActiveTermRoster(
	periods: readonly StudentWithdrawalPeriod[],
	term: EligibilityTerm & { endDate?: Date | null; closed?: boolean },
	at: Date,
) {
	if (!periods.length) return true;
	if (!evaluateStudentTermEligibility(periods, term).eligible) return false;
	if (term.closed) return true;
	const rosterDate = term.endDate && time(term.endDate) < at.getTime() ? new Date(term.endDate) : at;
	if (term.startDate && rosterDate.getTime() < time(term.startDate)) return true;
	return isStudentActiveOn(periods, rosterDate);
}

/** The open withdrawal, if the student is currently withdrawn. */
export function currentWithdrawal<T extends StudentWithdrawalPeriod>(periods: readonly T[]) {
	return periods.find((period) => isWithdrawalOpen(period)) ?? null;
}

export const STUDENT_WITHDRAWAL_ERROR_MESSAGE =
	"This student is withdrawn for the selected term. Readmit the student before enrolling them.";

const recordId = z.string().trim().min(1).max(200);

export const withdrawStudentSchema = z.object({
	studentId: recordId,
	withdrawalTermId: recordId,
	lastEnrolledDate: z.coerce.date(),
	reason: z.string().trim().min(3, "Enter a reason for the withdrawal.").max(500),
	note: z.string().trim().max(2000).optional().nullable(),
});

export type WithdrawStudentInput = z.infer<typeof withdrawStudentSchema>;

export const readmitStudentSchema = z.object({
	studentId: recordId,
	withdrawalId: recordId,
	readmissionTermId: recordId,
	readmittedOn: z.coerce.date(),
	note: z.string().trim().max(2000).optional().nullable(),
	/** Optional classroom for an enrollment in the readmission term only. */
	classroomDepartmentId: recordId.optional().nullable(),
});

export type ReadmitStudentInput = z.infer<typeof readmitStudentSchema>;

export const studentWithdrawalHistorySchema = z.object({ studentId: recordId });

export type StudentWithdrawalHistoryInput = z.infer<typeof studentWithdrawalHistorySchema>;

export type WithdrawalReconciliationEntry = {
	studentTermFormId: string;
	sessionTermId: string | null;
	termTitle: string | null;
	action: "ARCHIVED" | "FLAGGED";
	reasons: Array<"CHARGES" | "PAYMENTS" | "ASSESSMENTS" | "ATTENDANCE">;
};
