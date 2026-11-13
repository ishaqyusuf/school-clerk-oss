import {
	evaluateStudentTermEligibility,
	isStudentOnActiveTermRoster,
	STUDENT_WITHDRAWAL_ERROR_MESSAGE,
	type StudentWithdrawalPeriod,
} from "@school-clerk/utils/student-withdrawal";
import { Prisma } from "./generated/client";
import type { DatabaseTransaction } from "./prisma";

export class StudentWithdrawalError extends Error {
	constructor(
		public readonly code: "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "BAD_REQUEST",
		message: string,
	) {
		super(message);
		this.name = "StudentWithdrawalError";
	}
}

type Reader = Pick<DatabaseTransaction, "studentWithdrawal" | "sessionTerm">;

const periodSelect = {
	id: true,
	studentId: true,
	withdrawalTermId: true,
	lastEnrolledDate: true,
	readmissionTermId: true,
	readmittedOn: true,
} satisfies Prisma.StudentWithdrawalSelect;

/** Withdrawal periods per student. Only students with history appear in the map. */
export async function loadStudentWithdrawalPeriods(
	db: Pick<DatabaseTransaction, "studentWithdrawal">,
	input: { schoolId: string; studentIds?: readonly string[] },
) {
	if (input.studentIds && !input.studentIds.length) return new Map<string, StudentWithdrawalPeriod[]>();
	const rows = await db.studentWithdrawal.findMany({
		where: {
			schoolProfileId: input.schoolId,
			...(input.studentIds ? { studentId: { in: [...new Set(input.studentIds)] } } : {}),
		},
		orderBy: [{ lastEnrolledDate: "asc" }, { id: "asc" }],
		select: periodSelect,
	});
	const periods = new Map<string, StudentWithdrawalPeriod[]>();
	for (const { studentId, ...period } of rows) {
		periods.set(studentId, [...(periods.get(studentId) ?? []), period]);
	}
	return periods;
}

export async function loadEligibilityTerm(db: Pick<DatabaseTransaction, "sessionTerm">, schoolId: string, termId: string) {
	return db.sessionTerm.findFirst({
		where: { id: termId, schoolId, deletedAt: null },
		select: { id: true, title: true, startDate: true, endDate: true, lifecycleStatus: true, sessionId: true },
	});
}

/**
 * Lock the student rows shared so a concurrent withdrawal (which takes an
 * exclusive lock) cannot interleave with an enrollment write.
 */
export async function lockStudentsForEnrollment(tx: DatabaseTransaction, schoolId: string, studentIds: readonly string[]) {
	const ids = [...new Set(studentIds)].sort();
	if (!ids.length) return;
	await tx.$queryRaw(Prisma.sql`
		SELECT id FROM "Students"
		WHERE "schoolProfileId" = ${schoolId} AND id IN (${Prisma.join(ids)})
		ORDER BY id FOR SHARE
	`);
}

/**
 * The shared enrollment eligibility check used by term rollover, promotion,
 * manual enrollment, imports and suggestions. Call it inside the write
 * transaction (with `lock`) so stale previews cannot re-enroll a withdrawn
 * student.
 */
export async function partitionStudentsByTermEligibility(
	tx: DatabaseTransaction | Reader,
	input: { schoolId: string; termId: string; studentIds: readonly string[]; lock?: boolean },
) {
	const studentIds = [...new Set(input.studentIds)];
	if (input.lock) await lockStudentsForEnrollment(tx as DatabaseTransaction, input.schoolId, studentIds);
	const periods = await loadStudentWithdrawalPeriods(tx, { schoolId: input.schoolId, studentIds });
	if (!periods.size) return { eligible: studentIds, withdrawn: [] as string[] };
	const term = await loadEligibilityTerm(tx, input.schoolId, input.termId);
	if (!term) return { eligible: studentIds, withdrawn: [] as string[] };
	const eligible: string[] = [];
	const withdrawn: string[] = [];
	for (const studentId of studentIds) {
		const result = evaluateStudentTermEligibility(periods.get(studentId) ?? [], term);
		(result.eligible ? eligible : withdrawn).push(studentId);
	}
	return { eligible, withdrawn };
}

export async function assertStudentEligibleForTerm(
	tx: DatabaseTransaction | Reader,
	input: { schoolId: string; termId: string; studentId: string; lock?: boolean },
) {
	const { withdrawn } = await partitionStudentsByTermEligibility(tx, { ...input, studentIds: [input.studentId] });
	if (withdrawn.length) throw new StudentWithdrawalError("CONFLICT", STUDENT_WITHDRAWAL_ERROR_MESSAGE);
}

/**
 * Students who are withdrawn as of a term: excluded from its active roster and
 * listed by the Withdrawn filter. Historical rows are kept untouched.
 */
export async function getTermRosterExclusions(
	db: Pick<DatabaseTransaction, "studentWithdrawal" | "sessionTerm">,
	input: { schoolId: string; termId: string; at?: Date },
) {
	const periods = await loadStudentWithdrawalPeriods(db, { schoolId: input.schoolId });
	const excluded = new Set<string>();
	if (!periods.size) return excluded;
	const term = await loadEligibilityTerm(db, input.schoolId, input.termId);
	if (!term) return excluded;
	const at = input.at ?? new Date();
	for (const [studentId, studentPeriods] of periods) {
		if (!isStudentOnActiveTermRoster(studentPeriods, { ...term, closed: term.lifecycleStatus === "CLOSED" }, at)) {
			excluded.add(studentId);
		}
	}
	return excluded;
}

