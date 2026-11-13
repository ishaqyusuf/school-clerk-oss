import { canAccessModules, resolveModuleAccess } from "@school-clerk/utils/module-config";
import { activityStudentRef, activityTermRef } from "@school-clerk/utils/activity-refs";
import {
	readmitStudentSchema,
	type ReadmitStudentInput,
	type StudentWithdrawalPeriod,
	withdrawalCoversTerm,
	type WithdrawalReconciliationEntry,
	withdrawStudentSchema,
	type WithdrawStudentInput,
} from "@school-clerk/utils/student-withdrawal";
import { Prisma } from "./generated/client";
import { recordActivity } from "./activity-log";
import type { Database, DatabaseTransaction } from "./prisma";
import { getStudentAcademicReadContext } from "./student-academic-read";
import { loadEligibilityTerm as loadTerm, StudentWithdrawalError } from "./student-enrollment-eligibility";
import { enrollStudentInAcademicTermTransaction, StudentTermEnrollmentError } from "./student-term-enrollment";

type Actor = { schoolId: string; userId: string; bearer: string };

async function requireWithdrawalAuthority(tx: DatabaseTransaction, actor: Actor) {
	const context = await getStudentAcademicReadContext(tx, actor);
	if (
		!context ||
		!["ADMIN", "REGISTRAR"].includes(context.role?.toUpperCase() ?? "") ||
		!canAccessModules(resolveModuleAccess(context.school.moduleConfiguration), ["STUDENT_MANAGEMENT"])
	) {
		throw new StudentWithdrawalError("FORBIDDEN", "Withdrawing or readmitting a student requires administrator or registrar access.");
	}
	return context;
}

async function lockStudent(tx: DatabaseTransaction, schoolId: string, studentId: string) {
	const [student] = await tx.$queryRaw<Array<{ id: string; name: string; surname: string | null; otherName: string | null }>>(Prisma.sql`
		SELECT id, name, surname, "otherName" FROM "Students"
		WHERE id = ${studentId} AND "schoolProfileId" = ${schoolId} AND "deletedAt" IS NULL
		FOR UPDATE
	`);
	if (!student) throw new StudentWithdrawalError("NOT_FOUND", "Student was not found in this school.");
	return student;
}

async function actorName(tx: DatabaseTransaction, userId: string) {
	const user = await tx.user.findFirst({ where: { id: userId }, select: { name: true } });
	return user?.name ?? "Unknown user";
}

function sameOrBefore(a: Date | null | undefined, b: Date) {
	return Boolean(a && a.getTime() <= b.getTime());
}

/**
 * Archive future-term enrollments with no activity; keep and flag the ones
 * with financial or academic activity. Balances are never refunded, waived or
 * prorated here.
 */
async function reconcileCoveredEnrollments(
	tx: DatabaseTransaction,
	input: { schoolId: string; studentId: string; period: StudentWithdrawalPeriod; at: Date },
) {
	const forms = await tx.studentTermForm.findMany({
		where: { schoolProfileId: input.schoolId, studentId: input.studentId, deletedAt: null, sessionTermId: { not: null } },
		select: {
			id: true,
			sessionTermId: true,
			sessionTerm: { select: { id: true, title: true, startDate: true } },
		},
	});
	const covered = forms.filter((form) => form.sessionTerm && withdrawalCoversTerm(input.period, form.sessionTerm));
	if (!covered.length) return [] as WithdrawalReconciliationEntry[];
	const ids = covered.map((form) => form.id);
	const termIds = [...new Set(covered.map((form) => form.sessionTermId as string))];
	const [charges, assessments, attendance, payments] = await Promise.all([
		tx.financeCharge.findMany({
			where: { studentTermFormId: { in: ids }, deletedAt: null, status: { not: "CANCELLED" } },
			select: { studentTermFormId: true, allocations: { where: { deletedAt: null }, select: { id: true }, take: 1 } },
		}),
		tx.studentAssessmentRecord.findMany({
			where: { studentTermFormId: { in: ids }, deletedAt: null },
			select: { studentTermFormId: true },
			distinct: ["studentTermFormId"],
		}),
		tx.studentAttendance.findMany({
			where: { studentTermFormId: { in: ids }, deletedAt: null },
			select: { studentTermFormId: true },
			distinct: ["studentTermFormId"],
		}),
		tx.financePayment.findMany({
			where: { studentId: input.studentId, collectedSessionTermId: { in: termIds }, deletedAt: null },
			select: { collectedSessionTermId: true },
			distinct: ["collectedSessionTermId"],
		}),
	]);
	const has = (rows: Array<{ studentTermFormId: string | null }>) => new Set(rows.map((row) => row.studentTermFormId));
	const charged = has(charges);
	const paidByAllocation = has(charges.filter((charge) => charge.allocations.length));
	const assessed = has(assessments);
	const attended = has(attendance);
	const paidTerms = new Set(payments.map((payment) => payment.collectedSessionTermId));

	const entries: WithdrawalReconciliationEntry[] = covered.map((form) => {
		const reasons: WithdrawalReconciliationEntry["reasons"] = [];
		if (charged.has(form.id)) reasons.push("CHARGES");
		if (paidByAllocation.has(form.id) || paidTerms.has(form.sessionTermId)) reasons.push("PAYMENTS");
		if (assessed.has(form.id)) reasons.push("ASSESSMENTS");
		if (attended.has(form.id)) reasons.push("ATTENDANCE");
		return {
			studentTermFormId: form.id,
			sessionTermId: form.sessionTermId,
			termTitle: form.sessionTerm?.title ?? null,
			action: reasons.length ? "FLAGGED" : "ARCHIVED",
			reasons,
		};
	});
	const archiveIds = entries.filter((entry) => entry.action === "ARCHIVED").map((entry) => entry.studentTermFormId);
	if (archiveIds.length) {
		const archived = await tx.studentTermForm.updateMany({
			where: { id: { in: archiveIds }, schoolProfileId: input.schoolId, studentId: input.studentId, deletedAt: null },
			data: { deletedAt: input.at },
		});
		if (archived.count !== archiveIds.length) {
			throw new StudentWithdrawalError("CONFLICT", "Future enrollments changed during withdrawal. Refresh and try again.");
		}
	}
	return entries;
}

export async function withdrawStudent(db: Database, actor: Actor, input: WithdrawStudentInput) {
	const data = withdrawStudentSchema.parse(input);
	return db.$transaction(
		async (tx) => {
			const context = await requireWithdrawalAuthority(tx, actor);
			const schoolId = context.school.id;
			const student = await lockStudent(tx, schoolId, data.studentId);
			const term = await loadTerm(tx, schoolId, data.withdrawalTermId);
			if (!term) throw new StudentWithdrawalError("NOT_FOUND", "The affected academic term was not found in this school.");
			if (term.startDate && data.lastEnrolledDate.getTime() < term.startDate.getTime()) {
				throw new StudentWithdrawalError("BAD_REQUEST", "The last enrolled day is before this term starts. Choose the term the student last attended.");
			}
			if (term.endDate && data.lastEnrolledDate.getTime() > term.endDate.getTime()) {
				throw new StudentWithdrawalError("BAD_REQUEST", "The last enrolled day is after this term ends. Choose the term the student last attended.");
			}
			const history = await tx.studentWithdrawal.findMany({
				where: { schoolProfileId: schoolId, studentId: student.id },
				select: { id: true, readmittedOn: true },
			});
			if (history.some((period) => !period.readmittedOn)) {
				throw new StudentWithdrawalError("CONFLICT", "This student is already withdrawn. Readmit them before recording another withdrawal.");
			}
			if (history.some((period) => !sameOrBefore(period.readmittedOn, data.lastEnrolledDate))) {
				throw new StudentWithdrawalError("BAD_REQUEST", "The last enrolled day must be on or after the student's latest readmission.");
			}
			const now = new Date();
			const id = crypto.randomUUID();
			const period: StudentWithdrawalPeriod = {
				id,
				withdrawalTermId: term.id,
				lastEnrolledDate: data.lastEnrolledDate,
				readmissionTermId: null,
				readmittedOn: null,
			};
			const reconciliation = await reconcileCoveredEnrollments(tx, { schoolId, studentId: student.id, period, at: now });
			const withdrawal = await tx.studentWithdrawal.create({
				data: {
					id,
					schoolProfileId: schoolId,
					studentId: student.id,
					withdrawalTermId: term.id,
					lastEnrolledDate: data.lastEnrolledDate,
					reason: data.reason,
					note: data.note || null,
					withdrawnByUserId: actor.userId,
					reconciliation: reconciliation as unknown as Prisma.InputJsonValue,
				},
				select: { id: true },
			});
			const summary = {
				archived: reconciliation.filter((entry) => entry.action === "ARCHIVED").length,
				flagged: reconciliation.filter((entry) => entry.action === "FLAGGED").length,
			};
			const studentRef = activityStudentRef(student, context.school.studentNameFormat);
			const termRef = activityTermRef(term)!;
			// Legacy fields stay; `student`/`term` snapshots feed the activity renderer.
			const meta = {
				studentId: student.id,
				student: studentRef,
				withdrawalId: withdrawal.id,
				withdrawalTermId: term.id,
				term: termRef,
				lastEnrolledDate: data.lastEnrolledDate.toISOString(),
				reason: data.reason,
				reconciliation,
			};
			await recordActivity(tx, {
				schoolId,
				userId: actor.userId,
				author: await actorName(tx, actor.userId),
				type: "student_withdrawn",
				title: "Student withdrawn",
				description: `${studentRef.name} withdrawn from ${termRef.name}`,
				meta,
				subject: { type: "student", id: student.id },
			});
			return { status: "withdrawn" as const, withdrawalId: withdrawal.id, ...summary, reconciliation };
		},
		{ isolationLevel: "Serializable", maxWait: 5_000, timeout: 30_000 },
	);
}

export async function readmitStudent(db: Database, actor: Actor, input: ReadmitStudentInput) {
	const data = readmitStudentSchema.parse(input);
	try {
		return await db.$transaction(
			async (tx) => {
				const context = await requireWithdrawalAuthority(tx, actor);
				const schoolId = context.school.id;
				const student = await lockStudent(tx, schoolId, data.studentId);
				const withdrawal = await tx.studentWithdrawal.findFirst({
					where: { id: data.withdrawalId, schoolProfileId: schoolId, studentId: student.id },
					select: { id: true, lastEnrolledDate: true, readmittedOn: true, withdrawalTerm: { select: { startDate: true } } },
				});
				if (!withdrawal) throw new StudentWithdrawalError("NOT_FOUND", "Withdrawal record was not found for this student.");
				if (withdrawal.readmittedOn) throw new StudentWithdrawalError("CONFLICT", "This student has already been readmitted.");
				if (data.readmittedOn.getTime() <= withdrawal.lastEnrolledDate.getTime()) {
					throw new StudentWithdrawalError("BAD_REQUEST", "Readmission must be after the last enrolled day.");
				}
				const term = await loadTerm(tx, schoolId, data.readmissionTermId);
				if (!term) throw new StudentWithdrawalError("NOT_FOUND", "The readmission term was not found in this school.");
				if (term.endDate && data.readmittedOn.getTime() > term.endDate.getTime()) {
					throw new StudentWithdrawalError("BAD_REQUEST", "The readmission date is after the selected term ends.");
				}
				if (term.endDate && term.endDate.getTime() <= withdrawal.lastEnrolledDate.getTime()) {
					throw new StudentWithdrawalError("BAD_REQUEST", "The readmission term ended before the withdrawal.");
				}
				const now = new Date();
				const updated = await tx.studentWithdrawal.updateMany({
					where: { id: withdrawal.id, schoolProfileId: schoolId, readmittedOn: null },
					data: {
						readmissionTermId: term.id,
						readmittedOn: data.readmittedOn,
						readmissionNote: data.note || null,
						readmittedByUserId: actor.userId,
						readmittedAt: now,
					},
				});
				if (updated.count !== 1) throw new StudentWithdrawalError("CONFLICT", "The withdrawal changed. Refresh and try again.");
				// Readmission never fills enrollment gaps. It enrolls only in the
				// readmission term, and only when a classroom was chosen.
				const enrollment = data.classroomDepartmentId
					? await enrollStudentInAcademicTermTransaction(tx, actor, {
							studentId: student.id,
							classroomDepartmentId: data.classroomDepartmentId,
							schoolSessionId: term.sessionId,
							sessionTermId: term.id,
						})
					: null;
				const studentRef = activityStudentRef(student, context.school.studentNameFormat);
				const termRef = activityTermRef(term)!;
				const meta = {
					studentId: student.id,
					student: studentRef,
					withdrawalId: withdrawal.id,
					readmissionTermId: term.id,
					term: termRef,
					readmittedOn: data.readmittedOn.toISOString(),
					studentTermFormId: enrollment?.studentTermFormId ?? null,
				};
				await recordActivity(tx, {
					schoolId,
					userId: actor.userId,
					author: await actorName(tx, actor.userId),
					type: "student_readmitted",
					title: "Student readmitted",
					description: `${studentRef.name} readmitted for ${termRef.name}`,
					meta,
					subject: { type: "student", id: student.id },
				});
				return {
					status: "readmitted" as const,
					withdrawalId: withdrawal.id,
					enrollment: enrollment ? { status: enrollment.status, studentTermFormId: enrollment.studentTermFormId } : null,
				};
			},
			{ isolationLevel: "Serializable", maxWait: 5_000, timeout: 30_000 },
		);
	} catch (error) {
		if (error instanceof StudentTermEnrollmentError) throw new StudentWithdrawalError(error.code, error.message);
		throw error;
	}
}

/** Withdrawal history with live review flags for enrollments kept in covered terms. */
export async function getStudentWithdrawalHistory(db: Database, actor: Actor, input: { studentId: string }) {
	const context = await getStudentAcademicReadContext(db as unknown as DatabaseTransaction, actor);
	if (!context) throw new StudentWithdrawalError("FORBIDDEN", "Your session is no longer available.");
	const schoolId = context.school.id;
	const student = await db.students.findFirst({
		where: { id: input.studentId, schoolProfileId: schoolId, deletedAt: null },
		select: { id: true },
	});
	if (!student) throw new StudentWithdrawalError("NOT_FOUND", "Student was not found in this school.");
	const rows = await db.studentWithdrawal.findMany({
		where: { schoolProfileId: schoolId, studentId: student.id },
		orderBy: [{ lastEnrolledDate: "desc" }, { createdAt: "desc" }],
		select: {
			id: true,
			lastEnrolledDate: true,
			reason: true,
			note: true,
			createdAt: true,
			withdrawnByUserId: true,
			reconciliation: true,
			readmittedOn: true,
			readmittedAt: true,
			readmissionNote: true,
			readmittedByUserId: true,
			withdrawalTermId: true,
			readmissionTermId: true,
			withdrawalTerm: { select: { id: true, title: true, session: { select: { title: true } } } },
			readmissionTerm: { select: { id: true, title: true, session: { select: { title: true } } } },
		},
	});
	const userIds = [...new Set(rows.flatMap((row) => [row.withdrawnByUserId, row.readmittedByUserId]).filter(Boolean) as string[])];
	const users = userIds.length
		? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
		: [];
	const userName = new Map(users.map((user) => [user.id, user.name]));
	const forms = rows.length
		? await db.studentTermForm.findMany({
				where: { schoolProfileId: schoolId, studentId: student.id, deletedAt: null, sessionTermId: { not: null } },
				select: {
					id: true,
					sessionTerm: { select: { id: true, title: true, startDate: true } },
					classroomDepartment: { select: { departmentName: true, classRoom: { select: { name: true } } } },
				},
			})
		: [];
	const termLabel = (term: { title: string; session: { title: string } | null } | null) =>
		// Same "2nd Term 1447/1448" order as the student term history.
		term ? [term.title, term.session?.title].filter(Boolean).join(" ") : null;
	return rows.map((row) => {
		const period: StudentWithdrawalPeriod = {
			id: row.id,
			withdrawalTermId: row.withdrawalTermId,
			lastEnrolledDate: row.lastEnrolledDate,
			readmissionTermId: row.readmissionTermId,
			readmittedOn: row.readmittedOn,
		};
		const flaggedIds = new Set(
			((row.reconciliation as WithdrawalReconciliationEntry[] | null) ?? [])
				.filter((entry) => entry.action === "FLAGGED")
				.map((entry) => entry.studentTermFormId),
		);
		const needsReview = forms
			.filter((form) => form.sessionTerm && withdrawalCoversTerm(period, form.sessionTerm))
			.map((form) => ({
				studentTermFormId: form.id,
				termTitle: form.sessionTerm?.title ?? null,
				classroom: [form.classroomDepartment?.classRoom?.name, form.classroomDepartment?.departmentName]
					.filter(Boolean)
					.join(" "),
				flaggedAtWithdrawal: flaggedIds.has(form.id),
			}));
		return {
			id: row.id,
			status: row.readmittedOn ? ("readmitted" as const) : ("withdrawn" as const),
			withdrawalTerm: { id: row.withdrawalTermId, label: termLabel(row.withdrawalTerm) },
			lastEnrolledDate: row.lastEnrolledDate,
			reason: row.reason,
			note: row.note,
			recordedAt: row.createdAt,
			withdrawnBy: userName.get(row.withdrawnByUserId) ?? null,
			reconciliation: (row.reconciliation as WithdrawalReconciliationEntry[] | null) ?? [],
			needsReview,
			readmission: row.readmittedOn
				? {
						term: { id: row.readmissionTermId, label: termLabel(row.readmissionTerm) },
						readmittedOn: row.readmittedOn,
						note: row.readmissionNote,
						recordedAt: row.readmittedAt,
						readmittedBy: row.readmittedByUserId ? (userName.get(row.readmittedByUserId) ?? null) : null,
					}
				: null,
		};
	});
}
