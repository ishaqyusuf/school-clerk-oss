import type { TRPCContext } from "@api/trpc/init";
import { TRPCError } from "@trpc/server";
import { requireAcademicAdmin } from "./academic-term-setup";

export const TERM_RESET_CONFIRMATION = "I APPROVE RESET" as const;

type TermResetInput = {
	termId: string;
};

async function loadResetTarget(ctx: TRPCContext, termId: string) {
	const { schoolProfileId, user } = await requireAcademicAdmin(ctx);
	const term = await ctx.db.sessionTerm.findFirst({
		where: {
			id: termId,
			schoolId: schoolProfileId,
			deletedAt: null,
		},
		select: {
			id: true,
			title: true,
			lifecycleStatus: true,
			session: { select: { title: true } },
		},
	});
	if (!term) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Academic term was not found.",
		});
	}
	if (term.lifecycleStatus === "ACTIVE" || term.lifecycleStatus === "CLOSED") {
		throw new TRPCError({
			code: "CONFLICT",
			message:
				"Only draft or ready terms can be reset. Active and closed terms are protected.",
		});
	}
	return { schoolProfileId, term, user };
}

async function getFinanceRecordCount(
	ctx: TRPCContext,
	schoolProfileId: string,
	termId: string,
) {
	const [
		items,
		charges,
		collectedPayments,
		ledgerEntries,
		ledgerCloses,
		payrollStructures,
		purchases,
	] = await Promise.all([
		ctx.db.financeItem.count({
			where: { schoolProfileId, sessionTermId: termId, deletedAt: null },
		}),
		ctx.db.financeCharge.count({
			where: { schoolProfileId, sessionTermId: termId, deletedAt: null },
		}),
		ctx.db.financePayment.count({
			where: {
				schoolProfileId,
				collectedSessionTermId: termId,
				deletedAt: null,
			},
		}),
		ctx.db.financeLedgerEntry.count({
			where: {
				schoolProfileId,
				collectedSessionTermId: termId,
				deletedAt: null,
			},
		}),
		ctx.db.financeTermLedgerClose.count({
			where: { schoolProfileId, sessionTermId: termId, deletedAt: null },
		}),
		ctx.db.financePayrollStructure.count({
			where: { schoolProfileId, sessionTermId: termId, deletedAt: null },
		}),
		ctx.db.financePurchase.count({
			where: { schoolProfileId, sessionTermId: termId, deletedAt: null },
		}),
	]);
	return (
		items +
		charges +
		collectedPayments +
		ledgerEntries +
		ledgerCloses +
		payrollStructures +
		purchases
	);
}

export async function previewAcademicTermReset(
	ctx: TRPCContext,
	input: TermResetInput,
) {
	const { schoolProfileId, term } = await loadResetTarget(ctx, input.termId);
	const [
		subjects,
		students,
		teachers,
		attendanceSessions,
		assessmentLinks,
		workbookExports,
		workbookImports,
		financeRecords,
	] = await Promise.all([
		ctx.db.departmentSubject.count({
			where: { sessionTermId: term.id, deletedAt: null },
		}),
		ctx.db.studentTermForm.count({
			where: { schoolProfileId, sessionTermId: term.id, deletedAt: null },
		}),
		ctx.db.staffTermProfile.count({
			where: { sessionTermId: term.id, deletedAt: null },
		}),
		ctx.db.classRoomAttendance.count({
			where: { schoolProfileId, sessionTermId: term.id, deletedAt: null },
		}),
		ctx.db.assessmentPublicLink.count({
			where: { schoolProfileId, sessionTermId: term.id, deletedAt: null },
		}),
		ctx.db.assessmentWorkbookExport.count({
			where: { schoolProfileId, sessionTermId: term.id },
		}),
		ctx.db.assessmentWorkbookImport.count({
			where: { schoolProfileId, sessionTermId: term.id },
		}),
		getFinanceRecordCount(ctx, schoolProfileId, term.id),
	]);

	const blockers =
		financeRecords > 0
			? [
					{
						code: "FINANCE_DATA_EXISTS",
						message: `${financeRecords} finance record${financeRecords === 1 ? "" : "s"} must be resolved before this term can be reset.`,
					},
				]
			: [];

	return {
		term: {
			id: term.id,
			title: term.title,
			sessionTitle: term.session?.title ?? null,
			lifecycleStatus: term.lifecycleStatus ?? "DRAFT",
		},
		counts: {
			subjects,
			students,
			teachers,
			attendanceSessions,
			assessmentLinks,
			workbookExports,
			workbookImports,
			financeRecords,
		},
		blockers,
		canReset: blockers.length === 0,
		confirmationText: TERM_RESET_CONFIRMATION,
	};
}

export async function resetAcademicTerm(
	ctx: TRPCContext,
	input: TermResetInput & { confirmation: string },
) {
	if (input.confirmation !== TERM_RESET_CONFIRMATION) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Type ${TERM_RESET_CONFIRMATION} to confirm the reset.`,
		});
	}
	const preview = await previewAcademicTermReset(ctx, input);
	if (preview.blockers.length) {
		throw new TRPCError({
			code: "CONFLICT",
			message: preview.blockers[0]?.message ?? "This term cannot be reset.",
		});
	}
	const { schoolProfileId, term, user } = await loadResetTarget(
		ctx,
		input.termId,
	);
	const now = new Date();

	const result = await ctx.db.$transaction(
		async (tx) => {
			const transactionPreview = await previewAcademicTermReset(
				{ ...ctx, db: tx } as TRPCContext,
				input,
			);
			if (transactionPreview.blockers.length) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						transactionPreview.blockers[0]?.message ??
						"This term can no longer be reset.",
				});
			}
			const [attendance, termForms, staffProfiles, subjects] =
				await Promise.all([
					tx.classRoomAttendance.findMany({
						where: { schoolProfileId, sessionTermId: term.id, deletedAt: null },
						select: { id: true },
					}),
					tx.studentTermForm.findMany({
						where: { schoolProfileId, sessionTermId: term.id, deletedAt: null },
						select: { id: true },
					}),
					tx.staffTermProfile.findMany({
						where: { sessionTermId: term.id, deletedAt: null },
						select: { id: true },
					}),
					tx.departmentSubject.findMany({
						where: { sessionTermId: term.id, deletedAt: null },
						select: { id: true },
					}),
				]);
			const attendanceIds = attendance.map(({ id }) => id);
			const termFormIds = termForms.map(({ id }) => id);
			const staffTermProfileIds = staffProfiles.map(({ id }) => id);
			const subjectIds = subjects.map(({ id }) => id);

			await tx.attendanceSessionGuard.deleteMany({
				where: { attendanceId: { in: attendanceIds } },
			});
			await tx.studentAttendance.updateMany({
				where: {
					OR: [
						{ classroomAttendanceId: { in: attendanceIds } },
						{ studentTermFormId: { in: termFormIds } },
					],
					deletedAt: null,
				},
				data: { deletedAt: now },
			});
			await tx.classRoomAttendance.updateMany({
				where: { id: { in: attendanceIds } },
				data: {
					deletedAt: now,
					dedupeKey: null,
					idempotencyKey: null,
					idempotencyPayloadHash: null,
				},
			});
			await tx.studentAssessmentRecord.updateMany({
				where: { studentTermFormId: { in: termFormIds }, deletedAt: null },
				data: { deletedAt: now },
			});
			await tx.assessmentPublicLink.updateMany({
				where: { schoolProfileId, sessionTermId: term.id, deletedAt: null },
				data: { deletedAt: now, status: "REVOKED", revokedAt: now },
			});
			await tx.assessmentWorkbookImport.deleteMany({
				where: { schoolProfileId, sessionTermId: term.id },
			});
			await tx.assessmentWorkbookExport.deleteMany({
				where: { schoolProfileId, sessionTermId: term.id },
			});
			await tx.classroomSubjectAssessment.updateMany({
				where: { departmentSubjectId: { in: subjectIds }, deletedAt: null },
				data: { deletedAt: now },
			});
			await tx.staffSubject.updateMany({
				where: { departmentSubjectId: { in: subjectIds }, deletedAt: null },
				data: { deletedAt: now },
			});
			await tx.staffAcademicAccessGrant.updateMany({
				where: {
					staffTermProfileId: { in: staffTermProfileIds },
					deletedAt: null,
				},
				data: { deletedAt: now },
			});
			await tx.staffClassroomDepartmentTermProfiles.updateMany({
				where: {
					staffTermProfileId: { in: staffTermProfileIds },
					deletedAt: null,
				},
				data: { deletedAt: now },
			});
			await tx.staffTermProfile.updateMany({
				where: { id: { in: staffTermProfileIds } },
				data: { deletedAt: now },
			});
			await tx.studentTermForm.updateMany({
				where: { id: { in: termFormIds } },
				data: { deletedAt: now },
			});
			await tx.departmentSubject.updateMany({
				where: { id: { in: subjectIds } },
				data: { deletedAt: now },
			});
			await tx.academicTermSetupRun.deleteMany({
				where: { schoolProfileId, targetTermId: term.id },
			});
			await tx.sessionTerm.update({
				where: { id: term.id },
				data: {
					lifecycleStatus: "DRAFT",
					startDate: null,
					endDate: null,
					setupCompletedAt: null,
					activatedAt: null,
					activatedByUserId: null,
					closedAt: null,
					closedByUserId: null,
				},
			});
			await tx.activity.create({
				data: {
					schoolProfileId,
					userId: user.id,
					author: user.name,
					source: "user",
					type: "academic_term_setup_completed",
					title: "Academic term reset",
					description: `${term.title} was reset to an empty draft.`,
					meta: {
						action: "academic_term_reset",
						targetTermId: term.id,
						counts: transactionPreview.counts,
					},
				},
			});
			return transactionPreview.counts;
		},
		{ isolationLevel: "Serializable", timeout: 60_000 },
	);

	return { success: true as const, counts: result };
}
