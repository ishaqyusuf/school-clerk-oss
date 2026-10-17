import { compareClassroomDepartments } from "@school-clerk/db";
import { TRPCError } from "@trpc/server";
import type { TRPCContext } from "../../trpc/init";
import type {
	FinanceClassCollectionRosterInput,
	FinanceStudentOpenChargesInput,
	FinanceStudentPaymentBatchInput,
	FinanceStudentPaymentLinesInput,
} from "../../trpc/schemas/finance";
import {
	type FinancePaymentTransaction,
	assertTermLedgerWritable,
	findStudentTermFormForFinance,
	getOrCreateStream,
	reconcileClassroomTermCharges,
	reconcileStudentTermCharges,
	recordFinancePaymentInTransaction,
	requireFinanceReadAccess,
	requireFinanceWriteAccess,
	requireSchoolId,
	studentDisplayName,
	toMoney,
	toNumber,
} from "./finance";

/*
 * Collection flows built on the finance core: the balance-first receive sheet,
 * the row quick-pay popover and the class collection sheet. Every flow posts
 * through recordFinancePaymentInTransaction, so ledger, allocation and term
 * close rules stay in one place.
 */

const OPEN_CHARGE_STATUSES = ["DRAFT", "PENDING", "PARTIALLY_PAID"] as const;
const PAYMENT_TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 30_000 };

function classroomLabel(
	department?: {
		departmentName?: string | null;
		classRoom?: { name?: string | null } | null;
	} | null,
) {
	if (!department) return null;
	const className = department.classRoom?.name?.trim();
	const departmentName = department.departmentName?.trim();
	if (className && departmentName && departmentName !== className) {
		return departmentName.toLowerCase().startsWith(className.toLowerCase())
			? departmentName
			: `${className} ${departmentName}`;
	}
	return departmentName || className || null;
}

function termLabel(
	term?: { title?: string | null; session?: { title?: string | null } | null } | null,
) {
	if (!term) return null;
	return [term.session?.title, term.title].filter(Boolean).join(" · ") || null;
}

function isRequiredCharge(charge: {
	assignmentSource?: string | null;
	item?: { collectable?: boolean | null } | null;
}) {
	if (charge.assignmentSource === "REQUIRED_AUTO") return true;
	if (charge.assignmentSource === "OPTIONAL_SELECTED") return false;
	return Boolean(charge.item?.collectable);
}

/**
 * Every open charge a student owes, across terms, in the order a cashier
 * should clear them: oldest term first, then required before optional fees.
 */
export async function getStudentOpenCharges(
	ctx: TRPCContext,
	input: FinanceStudentOpenChargesInput,
) {
	requireFinanceReadAccess(ctx);
	const schoolProfileId = requireSchoolId(ctx);
	const termId = ctx.profile.termId ?? null;
	const sessionId = ctx.profile.sessionId ?? null;
	await reconcileStudentTermCharges(ctx, {
		studentId: input.studentId,
		termId,
		sessionId,
	});

	const student = await ctx.db.students.findFirst({
		where: { id: input.studentId, schoolProfileId, deletedAt: null },
		select: {
			id: true,
			name: true,
			surname: true,
			otherName: true,
			termForms: {
				where: {
					deletedAt: null,
					...(termId ? { sessionTermId: termId } : {}),
				},
				take: 1,
				orderBy: { createdAt: "desc" },
				select: {
					id: true,
					classroomDepartment: {
						select: {
							departmentName: true,
							classRoom: { select: { name: true } },
						},
					},
					sessionTerm: {
						select: { title: true, session: { select: { title: true } } },
					},
				},
			},
		},
	});

	if (!student) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Student was not found." });
	}

	const charges = await ctx.db.financeCharge.findMany({
		where: {
			schoolProfileId,
			studentId: input.studentId,
			deletedAt: null,
			status: { in: [...OPEN_CHARGE_STATUSES] },
		},
		select: {
			id: true,
			title: true,
			description: true,
			amount: true,
			amountPaid: true,
			status: true,
			assignmentSource: true,
			sessionTermId: true,
			createdAt: true,
			item: { select: { collectable: true } },
			stream: { select: { id: true, name: true } },
			sessionTerm: {
				select: {
					id: true,
					title: true,
					startDate: true,
					session: { select: { title: true } },
				},
			},
			studentTermForm: {
				select: {
					sessionTerm: {
						select: {
							id: true,
							title: true,
							startDate: true,
							session: { select: { title: true } },
						},
					},
				},
			},
		},
	});

	const rows = charges
		.map((charge) => {
			const term = charge.sessionTerm ?? charge.studentTermForm?.sessionTerm ?? null;
			const amount = toNumber(charge.amount);
			const amountPaid = toNumber(charge.amountPaid);
			return {
				id: charge.id,
				title: charge.title,
				description: charge.description,
				streamId: charge.stream.id,
				streamName: charge.stream.name,
				amount,
				amountPaid,
				outstanding: Math.max(0, amount - amountPaid),
				status: amountPaid > 0 ? ("PARTIAL" as const) : ("PENDING" as const),
				required: isRequiredCharge(charge),
				termId: term?.id ?? null,
				termLabel: termLabel(term) ?? "Unassigned term",
				isCurrentTerm: Boolean(term?.id && term.id === termId),
				termStart: term?.startDate ?? null,
				createdAt: charge.createdAt,
			};
		})
		.filter((row) => row.outstanding > 0.0001)
		.sort((a, b) => {
			if (a.isCurrentTerm !== b.isCurrentTerm) return a.isCurrentTerm ? 1 : -1;
			const aStart = a.termStart ? new Date(a.termStart).getTime() : 0;
			const bStart = b.termStart ? new Date(b.termStart).getTime() : 0;
			if (aStart !== bStart) return aStart - bStart;
			if (a.required !== b.required) return a.required ? -1 : 1;
			const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
			const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
			return aCreated - bCreated;
		})
		.map(({ termStart: _termStart, createdAt: _createdAt, ...row }) => row);

	const currentForm = student.termForms[0] ?? null;
	return {
		student: {
			id: student.id,
			name: studentDisplayName(student, ctx.profile.studentNameFormat),
			classroom: classroomLabel(currentForm?.classroomDepartment),
			termLabel: termLabel(currentForm?.sessionTerm),
			hasCurrentTermSheet: Boolean(currentForm),
		},
		charges: rows,
		totalOutstanding: rows.reduce((sum, row) => sum + row.outstanding, 0),
	};
}

type PaymentLinesTransaction = FinancePaymentTransaction &
	Pick<TRPCContext["db"], "financeStream">;

async function postStudentPaymentLines(
	ctx: TRPCContext,
	tx: PaymentLinesTransaction,
	input: FinanceStudentPaymentLinesInput,
	termForm: Awaited<ReturnType<typeof findStudentTermFormForFinance>>,
) {
	const schoolProfileId = requireSchoolId(ctx);
	const termId = ctx.profile.termId ?? null;
	const sessionId = ctx.profile.sessionId ?? null;
	const seen = new Set<string>();
	const postings: { chargeId: string; amount: number }[] = [];

	for (const line of input.lines) {
		if (seen.has(line.chargeId)) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Each fee can only appear once in a payment.",
			});
		}
		seen.add(line.chargeId);
		const charge = await tx.financeCharge.findFirst({
			where: {
				id: line.chargeId,
				schoolProfileId,
				studentId: input.studentId,
				deletedAt: null,
			},
			select: { id: true },
		});
		if (!charge) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "A selected fee does not belong to this student.",
			});
		}
		postings.push({ chargeId: charge.id, amount: line.amount });
	}

	for (const other of input.otherLines ?? []) {
		const title = other.title.trim();
		if (!title) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Describe what the other payment is for.",
			});
		}
		if (!termForm) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message:
					"The student needs a current term sheet before recording other payments.",
			});
		}
		await assertTermLedgerWritable(tx, {
			schoolProfileId,
			termId: termForm.sessionTermId,
		});
		const stream = await getOrCreateStream(tx, {
			schoolProfileId,
			streamId: other.streamId,
			streamName: other.streamName,
			type: "OTHER",
		});
		const charge = await tx.financeCharge.create({
			data: {
				schoolProfileId,
				streamId: stream.id,
				payerType: "STUDENT",
				studentId: input.studentId,
				studentTermFormId: termForm.id,
				classroomDepartmentId: termForm.classroomDepartmentId,
				schoolSessionId: termForm.schoolSessionId,
				sessionTermId: termForm.sessionTermId,
				title,
				amount: toMoney(other.amount),
				collectionStatus: "NOT_REQUIRED",
				assignmentSource: "MANUAL",
				createdById: ctx.currentUser?.id,
			},
			select: { id: true },
		});
		postings.push({ chargeId: charge.id, amount: other.amount });
	}

	if (!postings.length) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Choose at least one fee to pay.",
		});
	}

	const paymentIds: string[] = [];
	let totalAllocated = 0;
	for (const posting of postings) {
		const result = await recordFinancePaymentInTransaction(ctx, tx, {
			chargeId: posting.chargeId,
			amount: posting.amount,
			paymentDate: input.paymentDate ?? undefined,
			method: input.method ?? undefined,
			reference: input.reference ?? undefined,
			note: input.note ?? undefined,
			receivedById: ctx.currentUser?.id,
			collectedTermId: termId,
			collectedSessionId: sessionId,
		} as any);
		paymentIds.push(result.paymentId);
		totalAllocated += result.totalAllocated;
	}

	return { paymentIds, count: paymentIds.length, totalAllocated };
}

/**
 * Records one cash receipt split across several fees (and optional one-off
 * lines) for a single student. All lines post in one transaction, so either
 * the whole receipt lands or nothing does.
 */
export async function receiveStudentPaymentLines(
	ctx: TRPCContext,
	input: FinanceStudentPaymentLinesInput,
) {
	requireFinanceWriteAccess(ctx);
	const schoolProfileId = requireSchoolId(ctx);
	const student = await ctx.db.students.findFirst({
		where: { id: input.studentId, schoolProfileId },
		select: { id: true },
	});
	if (!student) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Student was not found." });
	}
	const termForm = input.otherLines?.length
		? await findStudentTermFormForFinance(ctx.db, {
				schoolProfileId,
				studentId: input.studentId,
				termId: ctx.profile.termId ?? null,
				sessionId: ctx.profile.sessionId ?? null,
			})
		: null;

	return ctx.db.$transaction(
		(tx) => postStudentPaymentLines(ctx, tx as PaymentLinesTransaction, input, termForm),
		PAYMENT_TRANSACTION_OPTIONS,
	);
}

/**
 * Posts many students' payments in one sitting. Each student posts in its own
 * transaction so one bad row never blocks the rest; the caller gets a result
 * per row.
 */
export async function receiveStudentPaymentBatch(
	ctx: TRPCContext,
	input: FinanceStudentPaymentBatchInput,
) {
	requireFinanceWriteAccess(ctx);
	const results: {
		studentId: string;
		chargeId: string;
		ok: boolean;
		paymentIds: string[];
		amount: number;
		error: string | null;
	}[] = [];

	for (const row of input.rows) {
		try {
			const result = await receiveStudentPaymentLines(ctx, {
				studentId: row.studentId,
				lines: [{ chargeId: row.chargeId, amount: row.amount }],
				otherLines: [],
				method: row.method ?? input.method ?? null,
				paymentDate: input.paymentDate ?? null,
				reference: input.reference ?? null,
				note: input.note ?? null,
			});
			results.push({
				studentId: row.studentId,
				chargeId: row.chargeId,
				ok: true,
				paymentIds: result.paymentIds,
				amount: result.totalAllocated,
				error: null,
			});
		} catch (error) {
			results.push({
				studentId: row.studentId,
				chargeId: row.chargeId,
				ok: false,
				paymentIds: [],
				amount: 0,
				error:
					error instanceof TRPCError || error instanceof Error
						? error.message
						: "Could not record this payment.",
			});
		}
	}

	const posted = results.filter((row) => row.ok);
	return {
		results,
		postedCount: posted.length,
		failedCount: results.length - posted.length,
		totalPosted: posted.reduce((sum, row) => sum + row.amount, 0),
	};
}

/**
 * The class collection sheet: classrooms registered this term, and for the
 * chosen classroom every fee with each student's charge against it.
 */
export async function getClassCollectionRoster(
	ctx: TRPCContext,
	input: FinanceClassCollectionRosterInput,
) {
	requireFinanceReadAccess(ctx);
	const schoolProfileId = requireSchoolId(ctx);
	const termId = ctx.profile.termId ?? null;
	const sessionId = ctx.profile.sessionId ?? null;

	const departments = await ctx.db.classRoomDepartment.findMany({
		where: {
			schoolProfileId,
			deletedAt: null,
			studentTermForms: {
				some: {
					deletedAt: null,
					studentId: { not: null },
					...(termId ? { sessionTermId: termId } : {}),
				},
			},
		},
		select: {
			id: true,
			departmentName: true,
			departmentLevel: true,
			classRoom: { select: { name: true, classLevel: true } },
			_count: {
				select: {
					studentTermForms: {
						where: {
							deletedAt: null,
							studentId: { not: null },
							...(termId ? { sessionTermId: termId } : {}),
						},
					},
				},
			},
		},
	});
	const classrooms = [...departments]
		.sort(compareClassroomDepartments)
		.map((department) => ({
			id: department.id,
			label: classroomLabel(department) ?? "Classroom",
			studentCount: department._count.studentTermForms,
		}));

	const classroomDepartmentId = input.classroomDepartmentId ?? classrooms[0]?.id ?? null;
	if (!classroomDepartmentId) {
		return { classrooms, classroomDepartmentId: null, fees: [], students: [] };
	}

	await reconcileClassroomTermCharges(ctx, {
		classroomDepartmentId,
		termId,
		sessionId,
	});

	const termForms = await ctx.db.studentTermForm.findMany({
		where: {
			schoolProfileId,
			deletedAt: null,
			classroomDepartmentId,
			studentId: { not: null },
			...(termId ? { sessionTermId: termId } : {}),
		},
		select: {
			id: true,
			student: {
				select: { id: true, name: true, surname: true, otherName: true },
			},
			financeCharges: {
				where: {
					deletedAt: null,
					payerType: "STUDENT",
					status: { notIn: ["CANCELLED", "WAIVED"] },
				},
				select: {
					id: true,
					itemId: true,
					streamId: true,
					title: true,
					amount: true,
					amountPaid: true,
					stream: { select: { name: true } },
				},
			},
		},
	});

	const fees = new Map<
		string,
		{ key: string; title: string; streamName: string; studentCount: number; outstanding: number }
	>();
	const students = termForms
		.filter((form) => form.student)
		.map((form) => {
			const student = form.student!;
			return {
				studentId: student.id,
				name: studentDisplayName(student, ctx.profile.studentNameFormat),
				charges: form.financeCharges.map((charge) => {
					const key = charge.itemId ?? `${charge.streamId}:${charge.title.trim().toLowerCase()}`;
					const amount = toNumber(charge.amount);
					const amountPaid = toNumber(charge.amountPaid);
					const outstanding = Math.max(0, amount - amountPaid);
					const fee = fees.get(key) ?? {
						key,
						title: charge.title,
						streamName: charge.stream.name,
						studentCount: 0,
						outstanding: 0,
					};
					fee.studentCount += 1;
					fee.outstanding += outstanding;
					fees.set(key, fee);
					return {
						feeKey: key,
						chargeId: charge.id,
						amount,
						amountPaid,
						outstanding,
					};
				}),
			};
		})
		.sort((a, b) => a.name.localeCompare(b.name));

	return {
		classrooms,
		classroomDepartmentId,
		fees: [...fees.values()].sort(
			(a, b) => b.studentCount - a.studentCount || a.title.localeCompare(b.title),
		),
		students,
	};
}
