import { randomUUID } from "node:crypto";
import { z } from "@hono/zod-openapi";
import { classroomDisplayName } from "@school-clerk/utils";
import { TRPCError } from "@trpc/server";
import {
	dispatchSchoolNotification,
	getCurrentUserContext,
	tryGetCurrentUserContext,
} from "../../lib/notifications";
import { authenticatedProcedure, createTRPCRouter } from "../init";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const streamFilterSchema = z.object({
	filter: z.enum(["term", "session"]).default("term"),
	termId: z.string().optional().nullable(),
	sessionId: z.string().optional().nullable(),
});

const addFundSchema = z.object({
	walletId: z.string(),
	amount: z.number().positive(),
	title: z.string().min(1),
	description: z.string().optional().nullable(),
	date: z.date().optional().nullable(),
});

const withdrawFundSchema = z.object({
	walletId: z.string(),
	amount: z.number().positive(),
	title: z.string().min(1),
	description: z.string().optional().nullable(),
	date: z.date().optional().nullable(),
});

const payBillSchema = z.object({
	billId: z.string(),
	amount: z.number().positive(),
	date: z.date().optional().nullable(),
});

const repayBillOwingSchema = z.object({
	billId: z.string(),
	amount: z.number().positive(),
	date: z.date().optional().nullable(),
});

const cancelBillPaymentSchema = z.object({
	billId: z.string(),
});

const financeReportFilterSchema = z.object({
	termId: z.string().optional().nullable(),
});

const internalTransferFilterSchema = z.object({
	termId: z.string().optional().nullable(),
});

const cancelInternalTransferSchema = z.object({
	transferId: z.string(),
	termId: z.string().optional().nullable(),
});

const generateBillsFromBillablesSchema = z.object({
	termId: z.string().optional().nullable(),
	billableIds: z.array(z.string()).optional().default([]),
});

const receivePaymentLineSchema = z.object({
	source: z.enum(["studentFee", "billable", "manual", "feeHistory"]),
	studentTermFormId: z.string().optional().nullable(),
	studentFeeId: z.string().optional().nullable(),
	billableHistoryId: z.string().optional().nullable(),
	feeHistoryId: z.string().optional().nullable(),
	streamId: z.string().optional().nullable(),
	streamName: z.string().optional().nullable(),
	title: z.string().optional().nullable(),
	description: z.string().optional().nullable(),
	amountDue: z.number().positive(),
	amountToPay: z.number().positive(),
});

const receivePaymentSchema = z.object({
	studentId: z.string(),
	studentTermFormId: z.string(),
	paymentMethod: z.string().min(1),
	paymentDate: z.date().optional().nullable(),
	reference: z.string().optional().nullable(),
	amountReceived: z.number().positive(),
	allocations: z.array(receivePaymentLineSchema).min(1),
});

function getStudentName(student?: {
	name?: string | null;
	surname?: string | null;
	otherName?: string | null;
} | null) {
	return [student?.name, student?.otherName, student?.surname]
		.filter(Boolean)
		.join(" ");
}

function getDepartmentName(
	department?: {
		departmentName?: string | null;
		classRoom?: { name?: string | null } | null;
	} | null,
) {
	if (!department) return null;
	return classroomDisplayName({
		className: department.classRoom?.name,
		departmentName: department.departmentName,
	});
}

function formatNaira(amount: number) {
	return new Intl.NumberFormat("en-NG", {
		style: "currency",
		currency: "NGN",
	}).format(amount);
}

const TRANSFER_REFERENCE_PREFIX = "TRF-";

function createTransferReference() {
	return `${TRANSFER_REFERENCE_PREFIX}${randomUUID().split("-")[0]?.toUpperCase()}`;
}

function formatTransferSummary(reference: string, summary?: string | null) {
	const note = summary?.trim() || "Fund transfer";
	return `[${reference}] ${note}`;
}

function extractTransferReference(summary?: string | null) {
	if (!summary) return null;
	const match = summary.match(/\[(TRF-[A-Z0-9]+)\]/);
	return match?.[1] ?? null;
}

function stripTransferReference(summary?: string | null) {
	if (!summary) return null;
	return summary.replace(/\[(TRF-[A-Z0-9]+)\]\s*/g, "").trim() || null;
}

function getInternalTransferGroupKey(transaction: {
	id: string;
	amount: number;
	summary?: string | null;
	transactionDate?: Date | null;
	createdAt?: Date | null;
}) {
	const reference = extractTransferReference(transaction.summary);
	if (reference) return `ref:${reference}`;
	const timestamp = (
		transaction.transactionDate ??
		transaction.createdAt ??
		new Date(0)
	).toISOString();
	return `legacy:${transaction.amount}:${transaction.summary || ""}:${timestamp}`;
}

function parseInternalTransferId(transferId: string) {
	if (transferId.startsWith("ref:")) {
		return {
			type: "reference" as const,
			reference: transferId.slice(4),
		};
	}
	if (transferId.startsWith("pair:")) {
		const ids = transferId
			.slice(5)
			.split(":")
			.filter(Boolean);
		return {
			type: "pair" as const,
			ids,
		};
	}
	throw new TRPCError({
		code: "BAD_REQUEST",
		message: "Invalid transfer reference.",
	});
}

function matchesCollectionStatus(
	fee: {
		billAmount: number;
		pendingAmount: number;
		collectionStatus?: string | null;
		feeHistory?: { dueDate?: Date | null } | null;
	},
	status: "ALL" | "PENDING" | "PARTIAL" | "PAID" | "WAIVED" | "OVERDUE",
) {
	if (status === "ALL") return true;
	if (status === "WAIVED") return fee.collectionStatus === "WAIVED";
	if (status === "OVERDUE") {
		return (
			fee.pendingAmount > 0 &&
			fee.collectionStatus !== "WAIVED" &&
			!!fee.feeHistory?.dueDate &&
			new Date(fee.feeHistory.dueDate) < new Date()
		);
	}
	if (status === "PAID") {
		return fee.pendingAmount <= 0 && fee.collectionStatus !== "WAIVED";
	}
	if (status === "PARTIAL") {
		return fee.pendingAmount > 0 && fee.pendingAmount < fee.billAmount;
	}
	if (status === "PENDING") {
		return fee.pendingAmount >= fee.billAmount && fee.billAmount > 0;
	}
	return true;
}

const FINANCE_READ_ROLES = new Set(["Admin", "Accountant"]);
const FINANCE_WRITE_ROLES = new Set(["Admin", "Accountant"]);
const ADMIN_ONLY_LARGE_ACTION_THRESHOLD = 250_000;

function requireFinanceRole(
	role: string | null | undefined,
	allowedRoles: Set<string>,
	action: string,
) {
	if (!role || !allowedRoles.has(role)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `You do not have permission to ${action}.`,
		});
	}
}

const financeReadProcedure = authenticatedProcedure.use(({ ctx, next }) => {
	requireFinanceRole(ctx.currentUser?.role, FINANCE_READ_ROLES, "view finance data");
	return next();
});

const financeWriteProcedure = authenticatedProcedure.use(({ ctx, next }) => {
	requireFinanceRole(
		ctx.currentUser?.role,
		FINANCE_WRITE_ROLES,
		"change finance data",
	);
	return next();
});

async function getStudentReceivePaymentData(ctx: any, studentId: string) {
	const student = await ctx.db.students.findFirstOrThrow({
		where: {
			id: studentId,
			schoolProfileId: ctx.profile.schoolId,
			deletedAt: null,
		},
		select: {
			id: true,
			name: true,
			surname: true,
			otherName: true,
			termForms: {
				where: {
					deletedAt: null,
				},
				orderBy: { createdAt: "asc" },
				select: {
					id: true,
					sessionTermId: true,
					schoolSessionId: true,
					createdAt: true,
					classroomDepartmentId: true,
					classroomDepartment: {
						select: {
							id: true,
							departmentName: true,
							classRoom: { select: { name: true } },
						},
					},
					sessionTerm: {
						select: {
							id: true,
							title: true,
							session: { select: { title: true } },
						},
					},
					studentFees: {
						where: {
							deletedAt: null,
							status: { not: "cancelled" },
						},
						select: {
							id: true,
							feeTitle: true,
							description: true,
							billAmount: true,
							pendingAmount: true,
							billablePriceId: true,
							feeHistoryId: true,
							feeHistory: {
								select: {
									wallet: { select: { id: true, name: true } },
								},
							},
							createdAt: true,
						},
						orderBy: { createdAt: "asc" },
					},
				},
			},
		},
	});

	const currentTermForm =
		student.termForms.find((termForm) => termForm.sessionTermId === ctx.profile.termId) ??
		null;
	const latestTermForm =
		student.termForms[student.termForms.length - 1] ?? null;

	// Load current-term FeeHistory records (student-side fees)
	const allFeeHistories = await ctx.db.feeHistory.findMany({
		where: {
			termId: ctx.profile.termId,
			current: true,
			deletedAt: null,
			fee: { schoolProfileId: ctx.profile.schoolId, deletedAt: null },
		},
		select: {
			id: true,
			amount: true,
			fee: { select: { title: true, description: true } },
			wallet: { select: { id: true, name: true } },
			classroomDepartments: {
				where: { deletedAt: null },
				select: { id: true },
			},
		},
	});

	if (!student.termForms.length) {
		return {
			student: {
				id: student.id,
				name: getStudentName(student),
				currentClassroom: getDepartmentName(
					latestTermForm?.classroomDepartment,
				),
				currentTerm:
					latestTermForm?.sessionTerm?.title &&
					latestTermForm?.sessionTerm?.session?.title
						? `${latestTermForm.sessionTerm.title} • ${latestTermForm.sessionTerm.session.title}`
						: null,
			},
			currentTermForm: null,
			alert: {
				variant: "destructive" as const,
				title: "No term sheet available",
				description:
					"This student does not have a term sheet yet, so there are no payable items to collect.",
			},
			summary: {
				totalDue: 0,
				totalPaid: 0,
				totalPending: 0,
			},
			terms: [],
			billables: [],
			feeItems: [],
			otherCharges: [],
			manualBillables: [],
			manualFeeHistories: [],
		};
	}

	const manualFeeHistories = currentTermForm
		? allFeeHistories
				.filter((fh) => {
					if (!fh.classroomDepartments.length) return true;
					return fh.classroomDepartments.some(
						(department) =>
							department.id === currentTermForm.classroomDepartmentId,
					);
				})
				.filter((fh) => {
					const appliedFeeHistoryIds = new Set(
						currentTermForm.studentFees
							.map((sf) => sf.feeHistoryId)
							.filter((id): id is string => Boolean(id)),
					);
					return !appliedFeeHistoryIds.has(fh.id);
				})
				.map((fh) => ({
					key: `fee-history-${fh.id}`,
					source: "feeHistory" as const,
					studentTermFormId: currentTermForm.id,
					studentFeeId: null,
					billableHistoryId: null,
					feeHistoryId: fh.id,
					title: fh.fee.title,
					description: fh.fee.description,
					amount: fh.amount,
					paidAmount: 0,
					pendingAmount: fh.amount,
					status: "UNAPPLIED" as const,
					streamId: fh.wallet?.id ?? null,
					streamName: fh.wallet?.name ?? null,
					classroomNames: [],
				}))
		: [];

	const terms = student.termForms.map((termForm) => {
		const feeItems = termForm.studentFees
			.filter(
				(
					fee,
				): fee is (typeof termForm.studentFees)[number] & {
					feeHistoryId: string;
				} => Boolean(fee.feeHistoryId),
			)
			.map((fee) => {
				const paidAmount = Math.max(
					(fee.billAmount ?? 0) - (fee.pendingAmount ?? 0),
					0,
				);
				const status: "PAID" | "PARTIAL" | "PENDING" =
					(fee.pendingAmount ?? 0) <= 0
						? "PAID"
						: (fee.pendingAmount ?? 0) < (fee.billAmount ?? 0)
							? "PARTIAL"
							: "PENDING";
				return {
					key: fee.id,
					source: "studentFee" as const,
					studentTermFormId: termForm.id,
					studentFeeId: fee.id,
					billableHistoryId: null,
					feeHistoryId: fee.feeHistoryId,
					title: fee.feeTitle || "Fee",
					description: fee.description,
					amount: fee.billAmount ?? 0,
					paidAmount,
					pendingAmount: fee.pendingAmount ?? 0,
					status,
					streamId: fee.feeHistory?.wallet?.id ?? null,
					streamName: fee.feeHistory?.wallet?.name ?? null,
					classroomNames: [],
				};
			});

		const otherCharges = termForm.studentFees
			.filter((fee) => !fee.feeHistoryId)
			.map((fee) => {
				const paidAmount = Math.max(
					(fee.billAmount ?? 0) - (fee.pendingAmount ?? 0),
					0,
				);
				const status: "PAID" | "PARTIAL" | "PENDING" =
					(fee.pendingAmount ?? 0) <= 0
						? "PAID"
						: (fee.pendingAmount ?? 0) < (fee.billAmount ?? 0)
							? "PARTIAL"
							: "PENDING";

				return {
					key: fee.id,
					source: "studentFee" as const,
					studentTermFormId: termForm.id,
					studentFeeId: fee.id,
					billableHistoryId: null,
					feeHistoryId: null,
					title: fee.feeTitle || "Charge",
					description: fee.description,
					amount: fee.billAmount ?? 0,
					paidAmount,
					pendingAmount: fee.pendingAmount ?? 0,
					status,
					streamId: null,
					streamName: null,
					classroomNames: [],
				};
			});

		const extraRows =
			currentTermForm?.id === termForm.id ? manualFeeHistories : [];
		const rows = [...feeItems, ...otherCharges, ...extraRows];
		const totalDue = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
		const totalPaid = rows.reduce(
			(sum, row) => sum + Number(row.paidAmount || 0),
			0,
		);
		const totalPending = rows.reduce(
			(sum, row) => sum + Number(row.pendingAmount || 0),
			0,
		);

		return {
			id: termForm.id,
			sessionTermId: termForm.sessionTermId,
			schoolSessionId: termForm.schoolSessionId,
			title: termForm.sessionTerm?.title || "Term",
			sessionTitle: termForm.sessionTerm?.session?.title || null,
			label:
				termForm.sessionTerm?.title && termForm.sessionTerm?.session?.title
					? `${termForm.sessionTerm.title} • ${termForm.sessionTerm.session.title}`
					: termForm.sessionTerm?.title || "Term",
			classroomName: getDepartmentName(termForm.classroomDepartment),
			isCurrent: termForm.sessionTermId === ctx.profile.termId,
			feeItems,
			otherCharges,
			rows,
			totals: {
				totalDue,
				totalPaid,
				totalPending,
			},
		};
	});

	const summary = terms.reduce(
		(acc, term) => ({
			totalDue: acc.totalDue + term.totals.totalDue,
			totalPaid: acc.totalPaid + term.totals.totalPaid,
			totalPending: acc.totalPending + term.totals.totalPending,
		}),
		{ totalDue: 0, totalPaid: 0, totalPending: 0 },
	);
	const totalUnapplied = manualFeeHistories.length;
	const currentTermRows = terms.find((term) => term.isCurrent)?.rows ?? [];
	const currentFeeItems =
		terms.find((term) => term.isCurrent)?.feeItems ?? [];
	const currentOtherCharges =
		terms.find((term) => term.isCurrent)?.otherCharges ?? [];

	return {
		student: {
			id: student.id,
			name: getStudentName(student),
			currentClassroom: getDepartmentName(
				(currentTermForm ?? latestTermForm)?.classroomDepartment,
			),
			currentTerm:
				(currentTermForm ?? latestTermForm)?.sessionTerm?.title &&
				(currentTermForm ?? latestTermForm)?.sessionTerm?.session?.title
					? `${(currentTermForm ?? latestTermForm)?.sessionTerm?.title} • ${(currentTermForm ?? latestTermForm)?.sessionTerm?.session?.title}`
					: null,
		},
		currentTermForm: {
			id: currentTermForm?.id ?? null,
			classroomDepartmentId: currentTermForm?.classroomDepartmentId ?? null,
			sessionTermId: currentTermForm?.sessionTermId ?? null,
		} as const,
		alert:
			!currentTermForm
				? {
						variant: "warning" as const,
						title: "No active term sheet",
						description:
							"This student has no sheet for the active term. You can still collect against existing term balances below.",
					}
				: totalUnapplied > 0
				? {
						variant: "warning" as const,
						title: "Charges still need to be applied",
						description: `${totalUnapplied} current-term charge${totalUnapplied > 1 ? "s are" : " is"} available for this student but not yet on the term sheet.`,
					}
				: null,
		summary,
		terms,
		billables: [],
		feeItems: currentFeeItems,
		otherCharges: currentOtherCharges,
		manualBillables: [],
		manualFeeHistories,
	};
}

async function getOrCreateWallet(
	db: any,
	{
		name,
		type,
		schoolId,
		termId,
	}: { name: string; type: string; schoolId: string; termId: string },
) {
	return db.wallet.upsert({
		where: {
			name_schoolProfileId_sessionTermId_type: {
				name,
				schoolProfileId: schoolId,
				sessionTermId: termId,
				type,
			},
		},
		update: {},
		create: { name, type, schoolProfileId: schoolId, sessionTermId: termId },
		select: { id: true, name: true },
	});
}

async function getWalletAvailableBalance(
	db: any,
	{
		walletId,
	}: {
		walletId: string;
	},
) {
	const transactions = await db.walletTransactions.findMany({
		where: {
			walletId,
			status: "success",
			deletedAt: null,
		},
		select: {
			amount: true,
			type: true,
		},
	});

	const incoming = transactions
		.filter((transaction) => {
			return transaction.type !== "transfer-out" && transaction.type !== "debit";
		})
		.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);

	const outgoing = transactions
		.filter((transaction) => {
			return transaction.type === "transfer-out" || transaction.type === "debit";
		})
		.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);

	return incoming - outgoing;
}

function billRepaymentSummary(billId: string) {
	return `owing-repayment:bill:${billId}`;
}

function getOutstandingOwingFromPayment(
	payment?: {
		deletedAt?: Date | null;
		invoice?: { amount?: number | null; deletedAt?: Date | null } | null;
		settlement?: { owingAmount?: number | null; deletedAt?: Date | null } | null;
	} | null,
) {
	if (!payment || payment.deletedAt) return 0;
	if (payment.settlement && !payment.settlement.deletedAt) {
		return payment.settlement.owingAmount || 0;
	}
	if (payment.invoice && !payment.invoice.deletedAt) {
		return payment.invoice.amount || 0;
	}
	return 0;
}

function getSettlementStatus(
	payment?: {
		deletedAt?: Date | null;
		settlement?: { status?: string | null; deletedAt?: Date | null } | null;
		invoice?: { amount?: number | null; deletedAt?: Date | null } | null;
		transaction?: { status?: string | null } | null;
	} | null,
) {
	if (!payment || payment.deletedAt) return "pending";
	if (payment.settlement && !payment.settlement.deletedAt) {
		return payment.settlement.status || "paid";
	}
	const legacyOwing = getOutstandingOwingFromPayment(payment);
	if (payment.transaction?.status === "success" && legacyOwing > 0) {
		return "paid_with_owing";
	}
	if (payment.transaction?.status === "success") return "paid";
	return "pending";
}

async function logFinanceActivity(
	ctx: {
		db: any;
		profile: { schoolId?: string | null };
		currentUser?: { id: string; name: string } | null;
	},
	input: {
		title: string;
		description?: string | null;
		type?: string;
		meta?: Record<string, unknown>;
	},
) {
	if (!ctx.currentUser?.id || !ctx.profile.schoolId) return;

	await ctx.db.activity.create({
		data: {
			userId: ctx.currentUser.id,
			author: ctx.currentUser.name,
			schoolProfileId: ctx.profile.schoolId,
			source: "user",
			type: (input.type || "assistant_action_completed") as any,
			title: input.title,
			description: input.description,
			meta: input.meta || {},
		},
	});
}

function requireAdminApprovalForLargeAction(
	ctx: {
		currentUser?: { role: string | null } | null;
	},
	{
		amount,
		action,
	}: {
		amount: number;
		action: string;
	},
) {
	if (
		amount > ADMIN_ONLY_LARGE_ACTION_THRESHOLD &&
		ctx.currentUser?.role !== "Admin"
	) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Admin approval is required to ${action} above ${formatNaira(
				ADMIN_ONLY_LARGE_ACTION_THRESHOLD,
			)}.`,
		});
	}
}

async function ensureBillSettlement(
	db: any,
	{
		billId,
		paymentId,
		requestedAmount,
		fundedAmount,
		owingAmount,
	}: {
		billId: string;
		paymentId: string;
		requestedAmount: number;
		fundedAmount: number;
		owingAmount: number;
	},
) {
	return db.billSettlement.upsert({
		where: { billId },
		update: {
			requestedAmount,
			fundedAmount,
			owingAmount,
			status: owingAmount > 0 ? "paid_with_owing" : "paid",
			deletedAt: null,
			billPaymentId: paymentId,
		},
		create: {
			billId,
			billPaymentId: paymentId,
			requestedAmount,
			fundedAmount,
			owingAmount,
			status: owingAmount > 0 ? "paid_with_owing" : "paid",
		},
	});
}

async function getOrCreateLegacySettlement(
	db: any,
	{
		billId,
	}: {
		billId: string;
	},
) {
	const bill = await db.bills.findFirstOrThrow({
		where: {
			id: billId,
			deletedAt: null,
			billPaymentId: { not: null },
		},
		select: {
			id: true,
			billPayment: {
				select: {
					id: true,
					amount: true,
					deletedAt: true,
					transaction: {
						select: {
							amount: true,
							status: true,
						},
					},
					invoice: {
						select: {
							amount: true,
							deletedAt: true,
						},
					},
					settlement: {
						select: {
							id: true,
							owingAmount: true,
							fundedAmount: true,
							requestedAmount: true,
							status: true,
							deletedAt: true,
						},
					},
				},
			},
		},
	});

	if (bill.billPayment?.settlement && !bill.billPayment.settlement.deletedAt) {
		return bill.billPayment.settlement;
	}

	const requestedAmount = bill.billPayment?.amount || 0;
	const fundedAmount =
		bill.billPayment?.transaction?.status === "success"
			? bill.billPayment?.transaction?.amount || 0
			: 0;
	const owingAmount =
		bill.billPayment?.invoice && !bill.billPayment.invoice.deletedAt
			? bill.billPayment.invoice.amount || 0
			: 0;

	return ensureBillSettlement(db, {
		billId: bill.id,
		paymentId: bill.billPayment!.id,
		requestedAmount,
		fundedAmount,
		owingAmount,
	});
}

async function buildFinanceReportingSnapshot(
	db: any,
	{
		schoolId,
		termId,
	}: {
		schoolId: string;
		termId: string;
	},
) {
	const [wallets, payrollBills, serviceBills, studentFees] = await Promise.all([
		db.wallet.findMany({
			where: {
				schoolProfileId: schoolId,
				sessionTermId: termId,
				deletedAt: null,
			},
			select: {
				id: true,
				name: true,
				type: true,
				defaultType: true,
				studentTransactions: {
					where: { deletedAt: null, status: "success" },
					select: { amount: true, type: true },
				},
				bills: {
					where: { deletedAt: null },
					select: {
						id: true,
						title: true,
						amount: true,
						billPaymentId: true,
						billPayment: {
							select: {
								id: true,
								deletedAt: true,
								amount: true,
								settlement: {
									select: {
										id: true,
										owingAmount: true,
										status: true,
										deletedAt: true,
									},
								},
								invoice: {
									select: {
										amount: true,
										deletedAt: true,
									},
								},
								transaction: {
									select: {
										amount: true,
										status: true,
									},
								},
							},
						},
					},
				},
			},
			orderBy: { name: "asc" },
		}),
		db.bills.findMany({
			where: {
				schoolProfileId: schoolId,
				sessionTermId: termId,
				deletedAt: null,
				staffTermProfileId: { not: null },
			},
			select: {
				id: true,
				title: true,
				amount: true,
				createdAt: true,
				wallet: { select: { id: true, name: true } },
				staffTermProfile: {
					select: {
						staffProfile: {
							select: { name: true, title: true },
						},
					},
				},
				billPayment: {
					select: {
						amount: true,
						deletedAt: true,
						settlement: {
							select: { owingAmount: true, status: true, deletedAt: true },
						},
						invoice: { select: { amount: true, deletedAt: true } },
						transaction: {
							select: {
								amount: true,
								status: true,
								transactionDate: true,
							},
						},
					},
				},
			},
			orderBy: { createdAt: "desc" },
		}),
		db.bills.findMany({
			where: {
				schoolProfileId: schoolId,
				sessionTermId: termId,
				deletedAt: null,
				staffTermProfileId: null,
			},
			select: {
				id: true,
				title: true,
				description: true,
				amount: true,
				createdAt: true,
				wallet: { select: { id: true, name: true } },
				billPayment: {
					select: {
						amount: true,
						deletedAt: true,
						settlement: {
							select: { owingAmount: true, status: true, deletedAt: true },
						},
						invoice: { select: { amount: true, deletedAt: true } },
						transaction: {
							select: {
								amount: true,
								status: true,
								transactionDate: true,
							},
						},
					},
				},
			},
			orderBy: { createdAt: "desc" },
		}),
		db.studentFee.findMany({
			where: {
				schoolProfileId: schoolId,
				studentTermForm: { sessionTermId: termId },
				deletedAt: null,
				status: { not: "cancelled" },
			},
			select: {
				id: true,
				feeTitle: true,
				billAmount: true,
				pendingAmount: true,
				collectionStatus: true,
				studentTermForm: {
					select: {
						id: true,
						student: { select: { name: true, surname: true, otherName: true } },
						classroomDepartment: {
							select: {
								departmentName: true,
								classRoom: { select: { name: true } },
							},
						},
					},
				},
				feeHistory: {
					select: {
						dueDate: true,
					},
				},
			},
		}),
	]);

	const streams = wallets.map((wallet: any) => {
		const totalIn = wallet.studentTransactions
			.filter((transaction: any) => transaction.type !== "transfer-out" && transaction.type !== "debit")
			.reduce((sum: number, transaction: any) => sum + (transaction.amount || 0), 0);
		const totalOut = wallet.studentTransactions
			.filter((transaction: any) => transaction.type === "transfer-out" || transaction.type === "debit")
			.reduce((sum: number, transaction: any) => sum + (transaction.amount || 0), 0);
		const pendingBills = wallet.bills
			.filter(
				(bill: any) =>
					!bill.billPaymentId ||
					bill.billPayment?.deletedAt ||
					bill.billPayment?.transaction?.status !== "success",
			)
			.reduce((sum: number, bill: any) => sum + (bill.amount || 0), 0);
		const owingAmount = wallet.bills.reduce(
			(sum: number, bill: any) => sum + getOutstandingOwingFromPayment(bill.billPayment),
			0,
		);

		return {
			id: wallet.id,
			name: wallet.name,
			type: wallet.type,
			defaultType: wallet.defaultType,
			totalIn,
			totalOut,
			availableFunds: totalIn - totalOut,
			pendingBills,
			owingAmount,
			projectedBalance: totalIn - totalOut - pendingBills - owingAmount,
		};
	});

	return {
		streams,
		payrollBills,
		serviceBills,
		studentFees,
	};
}

async function payBill(
	db: any,
	{
		billId,
		amount,
		date,
		schoolId,
		termId,
	}: {
		billId: string;
		amount: number;
		date?: Date | null;
		schoolId: string;
		termId: string;
	},
) {
	const bill = await db.bills.findFirstOrThrow({
		where: {
			id: billId,
			deletedAt: null,
			OR: [
				{ billPaymentId: null },
				{
					billPayment: {
						transaction: {
							status: "cancelled",
						},
					},
				},
			],
		},
		select: {
			id: true,
			amount: true,
			staffTermProfile: {
				select: {
					staffProfile: {
						select: { name: true },
					},
				},
			},
			title: true,
			walletId: true,
		},
	});

	const walletId =
		bill.walletId ||
		(
			await getOrCreateWallet(db, {
				name: bill.title || "General",
				type: "bill",
				schoolId,
				termId,
			})
		).id;

	const availableFunds = await getWalletAvailableBalance(db, { walletId });
	const requestedAmount = amount;
	const fundedAmount = Math.max(Math.min(availableFunds, requestedAmount), 0);
	const owingAmount = Math.max(requestedAmount - fundedAmount, 0);

	const transaction = await db.walletTransactions.create({
		data: {
			amount: fundedAmount,
			walletId,
			type: "debit",
			status: "success",
			summary: `Bill payment: ${bill.title || "General"}`,
			transactionDate: date ?? new Date(),
		},
	});

	const invoice = await db.billInvoice.create({
		data: { amount: owingAmount },
	});

	const payment = await db.billPayment.create({
		data: {
			amount: requestedAmount,
			transactionId: transaction.id,
			invoiceId: invoice.id,
			bills: { connect: { id: billId } },
		},
	});

	await db.bills.update({
		where: { id: billId },
		data: { billPaymentId: payment.id },
	});

	await ensureBillSettlement(db, {
		billId,
		paymentId: payment.id,
		requestedAmount,
		fundedAmount,
		owingAmount,
	});

	return {
		amount: requestedAmount,
		fundedAmount,
		owingAmount,
		paymentId: payment.id,
		staffName: bill.staffTermProfile?.staffProfile?.name ?? null,
		status: owingAmount > 0 ? "paid_with_owing" : "paid",
		success: true,
		title: bill.title,
	};
}

async function cancelBillPayment(
	db: any,
	{
		billId,
	}: {
		billId: string;
	},
) {
	const bill = await db.bills.findFirstOrThrow({
		where: {
			id: billId,
			billPaymentId: { not: null },
			deletedAt: null,
		},
		select: {
			amount: true,
			billPaymentId: true,
			staffTermProfile: {
				select: {
					staffProfile: {
						select: { name: true },
					},
				},
			},
			title: true,
		},
	});

	const payment = await db.billPayment.findFirstOrThrow({
		where: {
			id: bill.billPaymentId!,
			deletedAt: null,
		},
		select: {
			id: true,
			transactionId: true,
			invoiceId: true,
			settlement: {
				select: {
					id: true,
					repayments: {
						where: { deletedAt: null },
						select: {
							id: true,
							transactionId: true,
						},
					},
				},
			},
		},
	});

	await db.walletTransactions.update({
		where: { id: payment.transactionId },
		data: { status: "cancelled" },
	});

	if (payment.settlement?.repayments?.length) {
		await Promise.all(
			payment.settlement.repayments.map((repayment: { transactionId: string }) =>
				db.walletTransactions.update({
					where: { id: repayment.transactionId },
					data: { status: "cancelled" },
				}),
			),
		);

		await db.billSettlementRepayment.updateMany({
			where: {
				settlementId: payment.settlement.id,
				deletedAt: null,
			},
			data: {
				deletedAt: new Date(),
			},
		});
	} else {
		await db.walletTransactions.updateMany({
			where: {
				summary: {
					startsWith: billRepaymentSummary(billId),
				},
				deletedAt: null,
			},
			data: {
				status: "cancelled",
			},
		});
	}

	await db.billInvoice.update({
		where: { id: payment.invoiceId },
		data: { deletedAt: new Date() },
	});

	await db.billPayment.update({
		where: { id: payment.id },
		data: { deletedAt: new Date() },
	});

	if (payment.settlement?.id) {
		await db.billSettlement.update({
			where: { id: payment.settlement.id },
			data: {
				status: "cancelled",
				deletedAt: new Date(),
			},
		});
	}

	return {
		amount: bill.amount ?? 0,
		staffName: bill.staffTermProfile?.staffProfile?.name ?? null,
		success: true,
		title: bill.title,
	};
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const financeRouter = createTRPCRouter({
	// ── Accounting Streams ──────────────────────────────────────────────────────

	getStreams: financeReadProcedure
		.input(streamFilterSchema)
		.query(async ({ input, ctx }) => {
			const termId = input.termId || ctx.profile.termId;
			const where =
				input.filter === "session"
					? {
							schoolProfileId: ctx.profile.schoolId,
							sessionTerm: {
								session: { id: input.sessionId || ctx.profile.sessionId },
							},
							deletedAt: null,
						}
					: {
							schoolProfileId: ctx.profile.schoolId,
							sessionTermId: termId,
							deletedAt: null,
						};

			const wallets = await ctx.db.wallet.findMany({
				where,
				select: {
					id: true,
					name: true,
					type: true,
					defaultType: true,
					studentTransactions: {
						where: { status: "success", deletedAt: null },
						select: { amount: true, type: true },
					},
					bills: {
						where: { deletedAt: null },
						select: {
							amount: true,
							billPayment: {
								select: {
									deletedAt: true,
									invoice: { select: { amount: true } },
									settlement: {
										select: {
											owingAmount: true,
											status: true,
											deletedAt: true,
										},
									},
									transaction: { select: { status: true } },
								},
							},
						},
					},
					billableHistories: {
						where: { current: true, deletedAt: null },
						select: { amount: true },
					},
				},
				orderBy: { createdAt: "asc" },
			});

			return wallets.map((w) => {
				const incoming = w.studentTransactions
					.filter((t) => t.type !== "transfer-out" && t.type !== "debit")
					.reduce((s, t) => s + (t.amount || 0), 0);
				const outgoing = w.studentTransactions
					.filter((t) => t.type === "transfer-out" || t.type === "debit")
					.reduce((s, t) => s + (t.amount || 0), 0);
				const pendingBills = w.bills
					.filter(
						(bill) =>
							bill.billPayment?.deletedAt ||
							bill.billPayment?.transaction?.status !== "success",
					)
					.reduce((sum, bill) => sum + (bill.amount || 0), 0);
				const owingAmount = w.bills.reduce(
					(sum, bill) => sum + getOutstandingOwingFromPayment(bill.billPayment),
					0,
				);
				const activeBillables = w.billableHistories.reduce(
					(sum, billable) => sum + (billable.amount || 0),
					0,
				);
				const balance = incoming - outgoing;
				return {
					id: w.id,
					name: w.name,
					type: w.type,
					defaultType: (w as any).defaultType ?? "incoming",
					totalIn: incoming,
					totalOut: outgoing,
					balance,
					pendingBills,
					owingAmount,
					activeBillables,
					projectedBalance: balance - pendingBills - owingAmount,
				};
			});
		}),

	getStreamDetails: financeReadProcedure
		.input(z.object({ streamId: z.string() }))
		.query(async ({ input, ctx }) => {
			const wallet = await ctx.db.wallet.findFirst({
				where: {
					id: input.streamId,
					schoolProfileId: ctx.profile.schoolId,
					deletedAt: null,
				},
				select: {
					id: true,
					name: true,
					type: true,
					defaultType: true,
					createdAt: true,
					sessionTerm: {
						select: {
							title: true,
							session: { select: { title: true } },
						},
					},
					studentTransactions: {
						where: {
							deletedAt: null,
							status: { not: "cancelled" },
						},
						select: {
							id: true,
							amount: true,
							summary: true,
							type: true,
							status: true,
							transactionDate: true,
							createdAt: true,
							billPayment: {
								select: {
									bills: {
										where: { deletedAt: null },
										take: 1,
										orderBy: { createdAt: "desc" },
										select: {
											id: true,
											title: true,
											description: true,
										},
									},
								},
							},
							studentPayment: {
								select: {
									id: true,
									description: true,
									status: true,
									studentFee: {
										select: {
											feeTitle: true,
											description: true,
										},
									},
									studentTermForm: {
										select: {
											student: {
												select: {
													name: true,
													otherName: true,
													surname: true,
												},
											},
											classroomDepartment: {
												select: {
													departmentName: true,
													classRoom: { select: { name: true } },
												},
											},
										},
									},
								},
							},
						},
						orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
					},
					bills: {
						where: { deletedAt: null },
						select: {
							id: true,
							amount: true,
							title: true,
							description: true,
							createdAt: true,
							billPayment: {
								select: {
									deletedAt: true,
									id: true,
									amount: true,
									invoice: {
										select: {
											id: true,
											amount: true,
											deletedAt: true,
										},
									},
									settlement: {
										select: {
											id: true,
											owingAmount: true,
											status: true,
											deletedAt: true,
										},
									},
									transaction: { select: { status: true } },
								},
							},
						},
					},
					billableHistories: {
						where: { current: true, deletedAt: null },
						select: {
							id: true,
							amount: true,
							createdAt: true,
							billable: {
								select: {
									title: true,
									description: true,
								},
							},
						},
					},
				},
			});

			if (!wallet) {
				throw new Error("Account stream not found");
			}

			const totalIn = wallet.studentTransactions
				.filter((transaction) => {
					return (
						transaction.status === "success" &&
						transaction.type !== "transfer-out" &&
						transaction.type !== "debit"
					);
				})
				.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);

			const totalOut = wallet.studentTransactions
				.filter((transaction) => {
					return (
						transaction.status === "success" &&
						(transaction.type === "transfer-out" ||
							transaction.type === "debit")
					);
				})
				.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
			const pendingBills = wallet.bills
				.filter(
					(bill) =>
						bill.billPayment?.deletedAt ||
						bill.billPayment?.transaction?.status !== "success",
				)
				.reduce((sum, bill) => sum + (bill.amount || 0), 0);
			const pendingBillsCount = wallet.bills.filter(
				(bill) =>
					bill.billPayment?.deletedAt ||
					bill.billPayment?.transaction?.status !== "success",
			).length;
			const owingAmount = wallet.bills.reduce(
				(sum, bill) => sum + getOutstandingOwingFromPayment(bill.billPayment),
				0,
			);
			const activeBillables = wallet.billableHistories.reduce(
				(sum, billable) => sum + (billable.amount || 0),
				0,
			);
			const activeBillablesCount = wallet.billableHistories.length;
			const balance = totalIn - totalOut;

			const transactionRecords = wallet.studentTransactions.map((transaction) => {
				const bill = transaction.billPayment?.bills[0] ?? null;
				const student =
					transaction.studentPayment?.studentTermForm?.student ?? null;
				const studentClassroom = getDepartmentName(
					transaction.studentPayment?.studentTermForm?.classroomDepartment,
				);
				const direction =
					transaction.type === "transfer-out" || transaction.type === "debit"
						? "out"
						: "in";

				return {
					id: transaction.id,
					amount: transaction.amount,
					type: transaction.type,
					status: transaction.status ?? "success",
					direction,
					summary: transaction.summary,
					transactionDate:
						transaction.transactionDate ?? transaction.createdAt ?? null,
					createdAt: transaction.createdAt ?? null,
					title:
						transaction.summary ||
						transaction.studentPayment?.studentFee?.feeTitle ||
						bill?.title ||
						(student ? "Student payment" : "Account transaction"),
					description:
						transaction.studentPayment?.studentFee?.description ||
						transaction.studentPayment?.description ||
						bill?.description ||
						transaction.summary ||
						null,
					partyName: student
						? getStudentName(student)
						: transaction.type?.startsWith("transfer")
							? "Internal transfer"
							: bill?.title || "School account",
					studentClassroom,
					reference: transaction.id.slice(0, 8).toUpperCase(),
					recordKind: "transaction",
				};
			});

			const billRecords = wallet.bills.map((bill) => {
				const outstandingOwing = getOutstandingOwingFromPayment(bill.billPayment);
				const settlementStatus = getSettlementStatus(bill.billPayment);

				return {
					id: `bill-${bill.id}`,
					amount: bill.amount,
					type: "bill",
					status:
						settlementStatus === "paid_with_owing"
							? "owing"
							: bill.billPayment?.transaction?.status === "success"
								? "success"
								: "pending",
					direction: "out" as const,
					summary: bill.title,
					transactionDate: bill.createdAt ?? null,
					createdAt: bill.createdAt ?? null,
					title: bill.title || "Bill",
					description:
						outstandingOwing > 0
							? `${bill.description || "Paid with owing"} (owing ${formatNaira(
									outstandingOwing,
								)})`
							: bill.description || "Pending payment queued on this stream",
					partyName:
						bill.billPayment?.transaction?.status === "success"
							? "Paid payable"
							: "Payable",
					studentClassroom: null,
					reference: bill.id.slice(0, 8).toUpperCase(),
					recordKind: "bill",
				};
			});

			const billableRecords = wallet.billableHistories.map((billable) => ({
				id: `billable-${billable.id}`,
				amount: billable.amount,
				type: "billable",
				status: "pending",
				direction: "out" as const,
				summary: billable.billable.title,
				transactionDate: billable.createdAt ?? null,
				createdAt: billable.createdAt ?? null,
				title: billable.billable.title || "Billable",
				description:
					billable.billable.description || "Active billable assigned to this stream",
				partyName: "Billable setup",
				studentClassroom: null,
				reference: billable.id.slice(0, 8).toUpperCase(),
				recordKind: "billable",
			}));

			const records = [...transactionRecords, ...billRecords, ...billableRecords].sort(
				(a, b) => {
					const aTime = a.transactionDate ? new Date(a.transactionDate).getTime() : 0;
					const bTime = b.transactionDate ? new Date(b.transactionDate).getTime() : 0;
					return bTime - aTime;
				},
			);

			return {
				id: wallet.id,
				name: wallet.name,
				type: wallet.type,
				defaultType: (wallet as any).defaultType ?? "incoming",
				createdAt: wallet.createdAt,
				totalIn,
				totalOut,
				balance,
				pendingBills,
				pendingBillsCount,
				owingAmount,
				activeBillables,
				activeBillablesCount,
				projectedBalance: balance - pendingBills - owingAmount,
				periodLabel:
					wallet.sessionTerm?.title && wallet.sessionTerm.session?.title
						? `${wallet.sessionTerm.session.title} • ${wallet.sessionTerm.title}`
						: null,
				transactions: transactionRecords,
				records,
			};
		}),

	getFinanceIntegrityReport: financeReadProcedure
		.input(financeReportFilterSchema.optional())
		.query(async ({ input, ctx }) => {
			const termId = input?.termId || ctx.profile.termId!;
			const snapshot = await buildFinanceReportingSnapshot(ctx.db, {
				schoolId: ctx.profile.schoolId!,
				termId,
			});

			const cancelledButFunded = [...snapshot.payrollBills, ...snapshot.serviceBills]
				.filter(
					(bill: any) =>
						bill.billPayment?.deletedAt &&
						(bill.billPayment?.transaction?.amount || 0) > 0,
				)
				.map((bill: any) => ({
					id: bill.id,
					title: bill.title,
					amount: bill.billPayment?.transaction?.amount || 0,
				}));

			const missingStreams = [...snapshot.payrollBills, ...snapshot.serviceBills]
				.filter((bill: any) => !bill.wallet?.id)
				.map((bill: any) => ({
					id: bill.id,
					title: bill.title,
					amount: bill.amount || 0,
				}));

			const legacyPaymentsWithoutSettlement = [...snapshot.payrollBills, ...snapshot.serviceBills]
				.filter(
					(bill: any) =>
						bill.billPayment &&
						!bill.billPayment.deletedAt &&
						!bill.billPayment.settlement,
				)
				.map((bill: any) => ({
					id: bill.id,
					title: bill.title,
				}));

			const overdueFees = snapshot.studentFees.filter((fee: any) => {
				return (
					fee.pendingAmount > 0 &&
					fee.collectionStatus !== "WAIVED" &&
					fee.feeHistory?.dueDate &&
					new Date(fee.feeHistory.dueDate) < new Date()
				);
			});

			const streamProjectedDeficits = snapshot.streams.filter(
				(stream: any) => stream.projectedBalance < 0,
			);

			const totals = {
				streamAvailableFunds: snapshot.streams.reduce(
					(sum: number, stream: any) => sum + stream.availableFunds,
					0,
				),
				streamPendingBills: snapshot.streams.reduce(
					(sum: number, stream: any) => sum + stream.pendingBills,
					0,
				),
				streamOwing: snapshot.streams.reduce(
					(sum: number, stream: any) => sum + stream.owingAmount,
					0,
				),
				studentPendingFees: snapshot.studentFees.reduce(
					(sum: number, fee: any) => sum + (fee.pendingAmount || 0),
					0,
				),
				overdueFees: overdueFees.reduce(
					(sum: number, fee: any) => sum + (fee.pendingAmount || 0),
					0,
				),
			};

			const checks = [
				{
					id: "missing-stream-links",
					label: "Bills missing stream links",
					severity: missingStreams.length ? "error" : "ok",
					count: missingStreams.length,
					description: "Payables should always resolve to a wallet stream.",
				},
				{
					id: "legacy-settlement-gap",
					label: "Legacy payments without settlement rows",
					severity: legacyPaymentsWithoutSettlement.length ? "warning" : "ok",
					count: legacyPaymentsWithoutSettlement.length,
					description: "Older rows should be backfilled into the new settlement model.",
				},
				{
					id: "cancelled-funded-payments",
					label: "Cancelled payments with funded amounts",
					severity: cancelledButFunded.length ? "warning" : "ok",
					count: cancelledButFunded.length,
					description: "Cancelled payments should be reviewed for reversal integrity.",
				},
				{
					id: "stream-projected-deficits",
					label: "Streams projecting below zero",
					severity: streamProjectedDeficits.length ? "warning" : "ok",
					count: streamProjectedDeficits.length,
					description: "Projected deficits indicate pending obligations exceed current funding.",
				},
				{
					id: "overdue-fees",
					label: "Overdue student fee rows",
					severity: overdueFees.length ? "warning" : "ok",
					count: overdueFees.length,
					description: "Fee rows with pending balances past due date.",
				},
			];

			return {
				totals,
				checks,
				mismatches: {
					missingStreams,
					legacyPaymentsWithoutSettlement,
					cancelledButFunded,
					streamProjectedDeficits,
					overdueFees: overdueFees.map((fee: any) => ({
						id: fee.id,
						title: fee.feeTitle,
						pendingAmount: fee.pendingAmount,
						studentName: getStudentName(fee.studentTermForm?.student),
						classroomName: getDepartmentName(
							fee.studentTermForm?.classroomDepartment,
						),
					})),
				},
			};
		}),

	getFinanceReports: financeReadProcedure
		.input(financeReportFilterSchema.optional())
		.query(async ({ input, ctx }) => {
			const termId = input?.termId || ctx.profile.termId!;
			const snapshot = await buildFinanceReportingSnapshot(ctx.db, {
				schoolId: ctx.profile.schoolId!,
				termId,
			});

			const collectionsByClassroomMap = new Map<string, any>();
			for (const fee of snapshot.studentFees) {
				const classroomName =
					getDepartmentName(fee.studentTermForm?.classroomDepartment) ||
					"Unassigned";
				const current =
					collectionsByClassroomMap.get(classroomName) || {
						classroomName,
						totalBilled: 0,
						totalPending: 0,
						totalPaid: 0,
						students: new Set<string>(),
					};
				current.totalBilled += fee.billAmount || 0;
				current.totalPending += fee.pendingAmount || 0;
				current.totalPaid += Math.max(
					(fee.billAmount || 0) - (fee.pendingAmount || 0),
					0,
				);
				current.students.add(fee.studentTermForm?.id || fee.id);
				collectionsByClassroomMap.set(classroomName, current);
			}

			return {
				summary: {
					streamAvailableFunds: snapshot.streams.reduce(
						(sum: number, stream: any) => sum + stream.availableFunds,
						0,
					),
					streamPendingBills: snapshot.streams.reduce(
						(sum: number, stream: any) => sum + stream.pendingBills,
						0,
					),
					streamOwing: snapshot.streams.reduce(
						(sum: number, stream: any) => sum + stream.owingAmount,
						0,
					),
					totalPayrollGross: snapshot.payrollBills.reduce(
						(sum: number, bill: any) => sum + (bill.amount || 0),
						0,
					),
					totalServiceGross: snapshot.serviceBills.reduce(
						(sum: number, bill: any) => sum + (bill.amount || 0),
						0,
					),
					totalStudentPending: snapshot.studentFees.reduce(
						(sum: number, fee: any) => sum + (fee.pendingAmount || 0),
						0,
					),
				},
				streams: snapshot.streams,
				payroll: snapshot.payrollBills.map((bill: any) => ({
					id: bill.id,
					title: bill.title,
					staffName: bill.staffTermProfile?.staffProfile?.name || bill.title,
					streamName: bill.wallet?.name || "Unlinked",
					grossAmount: bill.amount || 0,
					fundedAmount: bill.billPayment?.transaction?.amount || 0,
					owingAmount: getOutstandingOwingFromPayment(bill.billPayment),
					status: getSettlementStatus(bill.billPayment),
					createdAt: bill.createdAt,
				})),
				servicePayments: snapshot.serviceBills.map((bill: any) => ({
					id: bill.id,
					title: bill.title,
					streamName: bill.wallet?.name || "Unlinked",
					amount: bill.amount || 0,
					fundedAmount: bill.billPayment?.transaction?.amount || 0,
					owingAmount: getOutstandingOwingFromPayment(bill.billPayment),
					status: getSettlementStatus(bill.billPayment),
					createdAt: bill.createdAt,
				})),
				collections: Array.from(collectionsByClassroomMap.values()).map(
					(row: any) => ({
						classroomName: row.classroomName,
						studentCount: row.students.size,
						totalBilled: row.totalBilled,
						totalPaid: row.totalPaid,
						totalPending: row.totalPending,
						collectionRate:
							row.totalBilled > 0
								? Math.round((row.totalPaid / row.totalBilled) * 100)
								: 0,
					}),
				),
				owingLedger: [...snapshot.payrollBills, ...snapshot.serviceBills]
					.map((bill: any) => ({
						id: bill.id,
						title: bill.title,
						streamName: bill.wallet?.name || "Unlinked",
						requestedAmount: bill.billPayment?.amount || 0,
						fundedAmount: bill.billPayment?.transaction?.amount || 0,
						owingAmount: getOutstandingOwingFromPayment(bill.billPayment),
						status: getSettlementStatus(bill.billPayment),
						createdAt: bill.createdAt,
					}))
					.filter((row: any) => row.owingAmount > 0 || row.status === "settled"),
			};
		}),

	createStream: financeWriteProcedure
		.input(
			z.object({
				name: z.string().min(1),
				type: z.string().default("fee"),
				defaultType: z.enum(["incoming", "outgoing"]).default("incoming"),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			return ctx.db.wallet.upsert({
				where: {
					name_schoolProfileId_sessionTermId_type: {
						name: input.name,
						schoolProfileId: ctx.profile.schoolId!,
						sessionTermId: ctx.profile.termId!,
						type: input.type,
					},
				},
				update: { defaultType: input.defaultType } as any,
				create: {
					name: input.name,
					type: input.type,
					defaultType: input.defaultType,
					schoolProfileId: ctx.profile.schoolId!,
					sessionTermId: ctx.profile.termId!,
				} as any,
				select: { id: true, name: true },
			});
		}),

	transferFunds: financeWriteProcedure
		.input(
			z.object({
				fromWalletId: z.string(),
				toWalletId: z.string(),
				amount: z.number().positive(),
				description: z.string().optional().nullable(),
				date: z.date().optional().nullable(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			requireAdminApprovalForLargeAction(ctx, {
				amount: input.amount,
				action: "transfer funds between streams",
			});
			const transferReference = createTransferReference();
			const note = input.description || "Fund transfer";
			const summary = formatTransferSummary(transferReference, note);
			const date = input.date ?? new Date();
			const result = await ctx.db.$transaction(
				async (tx) => {
					await tx.walletTransactions.create({
						data: {
							amount: input.amount,
							walletId: input.fromWalletId,
							type: "transfer-out",
							summary,
							status: "success",
							transactionDate: date,
						},
					});
					await tx.walletTransactions.create({
						data: {
							amount: input.amount,
							walletId: input.toWalletId,
							type: "transfer-in",
							summary,
							status: "success",
							transactionDate: date,
						},
					});
					return { success: true, reference: transferReference };
				},
				{
					maxWait: 10000,
					timeout: 20000,
				},
			);

			await logFinanceActivity(ctx, {
				title: "Finance transfer recorded",
				description: note,
				meta: {
					amount: input.amount,
					fromWalletId: input.fromWalletId,
					toWalletId: input.toWalletId,
					reference: transferReference,
				},
			});

			return result;
		}),

	getInternalTransfers: financeReadProcedure
		.input(internalTransferFilterSchema.optional())
		.query(async ({ input, ctx }) => {
			const termId = input?.termId || ctx.profile.termId;
			const transactions = await ctx.db.walletTransactions.findMany({
				where: {
					wallet: {
						schoolProfileId: ctx.profile.schoolId,
						sessionTermId: termId!,
					},
					type: { in: ["transfer-in", "transfer-out"] },
					deletedAt: null,
				},
				select: {
					id: true,
					amount: true,
					summary: true,
					type: true,
					status: true,
					transactionDate: true,
					createdAt: true,
					wallet: {
						select: {
							id: true,
							name: true,
						},
					},
				},
				orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
			});

			const grouped = new Map<string, typeof transactions>();
			for (const transaction of transactions) {
				const key = getInternalTransferGroupKey(transaction);
				const group = grouped.get(key) ?? [];
				group.push(transaction);
				grouped.set(key, group);
			}

			return Array.from(grouped.entries())
				.map(([key, items]) => {
					const outgoing = items.find((item) => item.type === "transfer-out") ?? null;
					const incoming = items.find((item) => item.type === "transfer-in") ?? null;
					const reference =
						extractTransferReference(outgoing?.summary) ||
						extractTransferReference(incoming?.summary);
					const amount = outgoing?.amount ?? incoming?.amount ?? 0;
					const note =
						stripTransferReference(outgoing?.summary) ||
						stripTransferReference(incoming?.summary) ||
						"Fund transfer";
					const status = items.some((item) => item.status === "cancelled")
						? "cancelled"
						: items.every((item) => item.status === "success")
							? "success"
							: "pending";
					const canCancel =
						status === "success" &&
						!!outgoing &&
						!!incoming &&
						items.length === 2 &&
						outgoing.amount === incoming.amount;

					return {
						id:
							reference && canCancel
								? `ref:${reference}`
								: outgoing && incoming && canCancel
									? `pair:${outgoing.id}:${incoming.id}`
									: `${key}:${items[0]?.id || "unknown"}`,
						reference,
						description: note,
						amount,
						status,
						canCancel,
						transactionDate:
							outgoing?.transactionDate ||
							incoming?.transactionDate ||
							outgoing?.createdAt ||
							incoming?.createdAt ||
							null,
						fromWalletId: outgoing?.wallet.id ?? null,
						fromWalletName: outgoing?.wallet.name ?? null,
						toWalletId: incoming?.wallet.id ?? null,
						toWalletName: incoming?.wallet.name ?? null,
						outgoingTransactionId: outgoing?.id ?? null,
						incomingTransactionId: incoming?.id ?? null,
						transactionCount: items.length,
					};
				})
				.sort((a, b) => {
					const aTime = a.transactionDate ? new Date(a.transactionDate).getTime() : 0;
					const bTime = b.transactionDate ? new Date(b.transactionDate).getTime() : 0;
					return bTime - aTime;
				});
		}),

	cancelInternalTransfer: financeWriteProcedure
		.input(cancelInternalTransferSchema)
		.mutation(async ({ input, ctx }) => {
			const termId = input.termId || ctx.profile.termId;
			const parsed = parseInternalTransferId(input.transferId);

			let transferTransactions: Array<{
				id: string;
				amount: number;
				summary: string | null;
				type: string | null;
				status: string | null;
				walletId: string;
			}> = [];

			if (parsed.type === "pair") {
				transferTransactions = await ctx.db.walletTransactions.findMany({
					where: {
						id: { in: parsed.ids },
						wallet: {
							schoolProfileId: ctx.profile.schoolId,
							sessionTermId: termId!,
						},
						type: { in: ["transfer-in", "transfer-out"] },
						deletedAt: null,
					},
					select: {
						id: true,
						amount: true,
						summary: true,
						type: true,
						status: true,
						walletId: true,
					},
				});
			} else {
				const candidates = await ctx.db.walletTransactions.findMany({
					where: {
						wallet: {
							schoolProfileId: ctx.profile.schoolId,
							sessionTermId: termId!,
						},
						type: { in: ["transfer-in", "transfer-out"] },
						deletedAt: null,
					},
					select: {
						id: true,
						amount: true,
						summary: true,
						type: true,
						status: true,
						walletId: true,
					},
				});
				transferTransactions = candidates.filter(
					(transaction) =>
						extractTransferReference(transaction.summary) === parsed.reference,
				);
			}

			if (transferTransactions.length !== 2) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Unable to identify the two transfer records for this internal transfer.",
				});
			}

			const outgoing = transferTransactions.find(
				(transaction) => transaction.type === "transfer-out",
			);
			const incoming = transferTransactions.find(
				(transaction) => transaction.type === "transfer-in",
			);

			if (!outgoing || !incoming || outgoing.amount !== incoming.amount) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This transfer is incomplete and cannot be cancelled safely.",
				});
			}

			if (transferTransactions.some((transaction) => transaction.status === "cancelled")) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This transfer has already been cancelled.",
				});
			}

			await ctx.db.$transaction(
				async (tx) => {
					await tx.walletTransactions.updateMany({
						where: {
							id: { in: transferTransactions.map((transaction) => transaction.id) },
						},
						data: {
							status: "cancelled",
						},
					});
				},
				{
					maxWait: 10000,
					timeout: 20000,
				},
			);

			const description =
				stripTransferReference(outgoing.summary) ||
				stripTransferReference(incoming.summary) ||
				"Fund transfer";

			await logFinanceActivity(ctx, {
				title: "Finance transfer cancelled",
				description,
				meta: {
					amount: outgoing.amount,
					fromWalletId: outgoing.walletId,
					toWalletId: incoming.walletId,
					transferId: input.transferId,
					reference:
						parsed.type === "reference"
							? parsed.reference
							: extractTransferReference(outgoing.summary),
				},
			});

			return { success: true };
		}),

	addFund: financeWriteProcedure
		.input(addFundSchema)
		.mutation(async ({ input, ctx }) => {
			await ctx.db.wallet.findFirstOrThrow({
				where: {
					id: input.walletId,
					schoolProfileId: ctx.profile.schoolId,
					deletedAt: null,
				},
			});

			const fund = await ctx.db.funds.create({
				data: {
					title: input.title,
					description: input.description ?? "",
					amount: input.amount,
					pendingAmount: 0,
					walletId: input.walletId,
				},
			});

			await ctx.db.walletTransactions.create({
				data: {
					amount: input.amount,
					walletId: input.walletId,
					type: "credit",
					summary: input.title,
					status: "success",
					transactionDate: input.date ?? new Date(),
					fundId: fund.id,
				},
			});

			await logFinanceActivity(ctx, {
				title: "Stream funded",
				description: input.title,
				meta: {
					amount: input.amount,
					walletId: input.walletId,
				},
			});

			return { success: true };
		}),

	withdrawFund: financeWriteProcedure
		.input(withdrawFundSchema)
		.mutation(async ({ input, ctx }) => {
			requireAdminApprovalForLargeAction(ctx, {
				amount: input.amount,
				action: "withdraw funds",
			});
			await ctx.db.wallet.findFirstOrThrow({
				where: {
					id: input.walletId,
					schoolProfileId: ctx.profile.schoolId,
					deletedAt: null,
				},
			});

			await ctx.db.walletTransactions.create({
				data: {
					amount: input.amount,
					walletId: input.walletId,
					type: "debit",
					summary: input.title,
					status: "success",
					transactionDate: input.date ?? new Date(),
				},
			});

			await logFinanceActivity(ctx, {
				title: "Stream withdrawal recorded",
				description: input.title,
				meta: {
					amount: input.amount,
					walletId: input.walletId,
				},
			});

			return { success: true };
		}),

	// ── Service Payments ────────────────────────────────────────────────────────

	getServicePayments: financeReadProcedure
		.input(z.object({ termId: z.string().optional().nullable() }))
		.query(async ({ input, ctx }) => {
			const termId = input.termId || ctx.profile.termId;
			return ctx.db.bills.findMany({
				where: {
					schoolProfileId: ctx.profile.schoolId,
					sessionTermId: termId!,
					staffTermProfileId: null,
					deletedAt: null,
				},
				select: {
					id: true,
					title: true,
					description: true,
					amount: true,
					walletId: true,
					billPaymentId: true,
					createdAt: true,
					wallet: {
						select: { id: true, name: true },
					},
					billable: { select: { title: true, type: true } },
					billPayment: {
						select: {
							id: true,
							deletedAt: true,
							amount: true,
							invoice: {
								select: {
									id: true,
									amount: true,
									deletedAt: true,
								},
							},
							settlement: {
								select: {
									id: true,
									owingAmount: true,
									status: true,
									deletedAt: true,
								},
							},
							transaction: {
								select: {
									id: true,
									amount: true,
									transactionDate: true,
									status: true,
								},
							},
						},
					},
				},
				orderBy: { createdAt: "desc" },
			});
		}),

	createServicePayment: financeWriteProcedure
		.input(
			z.object({
				title: z.string().min(1),
				streamId: z.string().optional().nullable(),
				streamName: z.string().optional().nullable(),
				description: z.string().optional().nullable(),
				amount: z.number().positive(),
				date: z.date().optional().nullable(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const existingWallet = input.streamId
				? await ctx.db.wallet.findFirst({
						where: {
							id: input.streamId,
							schoolProfileId: ctx.profile.schoolId,
							sessionTermId: ctx.profile.termId,
							deletedAt: null,
						},
						select: { id: true, name: true },
					})
				: null;
			const streamName = input.streamName?.trim() || input.title.trim();
			const wallet =
				existingWallet ||
				(await ctx.db.wallet.upsert({
					where: {
						name_schoolProfileId_sessionTermId_type: {
							name: streamName,
							schoolProfileId: ctx.profile.schoolId!,
							sessionTermId: ctx.profile.termId!,
							type: "bill",
						},
					},
					update: { defaultType: "outgoing" } as any,
					create: {
						name: streamName,
						type: "bill",
						defaultType: "outgoing",
						schoolProfileId: ctx.profile.schoolId!,
						sessionTermId: ctx.profile.termId!,
					} as any,
					select: { id: true, name: true },
				}));

			const bill = await ctx.db.bills.create({
				data: {
					title: streamName,
					description: input.description,
					amount: input.amount,
					schoolProfileId: ctx.profile.schoolId!,
					schoolSessionId: ctx.profile.sessionId!,
					sessionTermId: ctx.profile.termId!,
					walletId: wallet.id,
				},
				select: { id: true },
			});

			await logFinanceActivity(ctx, {
				title: "Service payable created",
				description: input.title,
				meta: {
					billId: bill.id,
					amount: input.amount,
					streamName,
				},
			});

			return bill;
		}),

	payServiceBill: financeWriteProcedure
		.input(payBillSchema)
		.mutation(async ({ input, ctx }) => {
			const current = await tryGetCurrentUserContext(ctx);
			const result = await ctx.db.$transaction(async (tx) => {
				return payBill(tx, {
					billId: input.billId,
					amount: input.amount,
					date: input.date,
					schoolId: ctx.profile.schoolId!,
					termId: ctx.profile.termId!,
				});
			});

			if (current) {
				await dispatchSchoolNotification(ctx, {
					audience: "finance",
					type: "service_payment_recorded",
					payload: {
						actorName: current.user.name,
						amount: formatNaira(result.amount),
						expenseTitle: result.title || "Service payment",
						link: "/finance/payments",
						schoolName: current.school.name,
					},
				});
			}

			await logFinanceActivity(ctx, {
				title: "Service payable paid",
				description: result.title || "Service payment issued",
				meta: {
					billId: input.billId,
					amount: result.amount,
					fundedAmount: result.fundedAmount,
					owingAmount: result.owingAmount,
				},
			});

			return result;
		}),

	repayBillOwing: financeWriteProcedure
		.input(repayBillOwingSchema)
		.mutation(async ({ input, ctx }) => {
			const result = await ctx.db.$transaction(async (tx) => {
				const bill = await tx.bills.findFirstOrThrow({
					where: {
						id: input.billId,
						schoolProfileId: ctx.profile.schoolId,
						deletedAt: null,
						billPaymentId: { not: null },
					},
					select: {
						id: true,
						title: true,
						walletId: true,
						billPayment: {
							select: {
								id: true,
								amount: true,
								transaction: {
									select: {
										amount: true,
										status: true,
									},
								},
								invoice: { select: { id: true, amount: true, deletedAt: true } },
								settlement: {
									select: {
										id: true,
										owingAmount: true,
										fundedAmount: true,
										requestedAmount: true,
										status: true,
										deletedAt: true,
									},
								},
							},
						},
					},
				});

				if (!bill.walletId) {
					throw new Error("This payable is not linked to a stream.");
				}

				const settlement =
					bill.billPayment?.settlement && !bill.billPayment.settlement.deletedAt
						? bill.billPayment.settlement
						: await getOrCreateLegacySettlement(tx, {
								billId: bill.id,
							});

				const outstanding = settlement?.owingAmount ?? 0;
				if (outstanding <= 0) {
					throw new Error("This payable has no outstanding owing.");
				}

				const availableFunds = await getWalletAvailableBalance(tx, {
					walletId: bill.walletId,
				});
				const repayAmount = Math.min(input.amount, outstanding, availableFunds);

				if (repayAmount <= 0) {
					throw new Error("No available funds to repay owing on this stream.");
				}

				const repaymentTransaction = await tx.walletTransactions.create({
					data: {
						amount: repayAmount,
						walletId: bill.walletId,
						type: "debit",
						status: "success",
						summary: `${billRepaymentSummary(bill.id)}:${bill.title || "Payable"}`,
						transactionDate: input.date ?? new Date(),
					},
				});

				await tx.billSettlement.update({
					where: { id: settlement.id },
					data: {
						owingAmount: Math.max(outstanding - repayAmount, 0),
						status:
							outstanding - repayAmount <= 0 ? "settled" : "paid_with_owing",
					},
				});

				await tx.billSettlementRepayment.create({
					data: {
						settlementId: settlement.id,
						transactionId: repaymentTransaction.id,
						amount: repayAmount,
					},
				});

				if (bill.billPayment?.invoice?.id && !bill.billPayment.invoice.deletedAt) {
					await tx.billInvoice.update({
						where: { id: bill.billPayment.invoice.id },
						data: {
							amount: Math.max(outstanding - repayAmount, 0),
						},
					});
				}

				return {
					billId: bill.id,
					repaidAmount: repayAmount,
					outstandingOwing: Math.max(outstanding - repayAmount, 0),
					title: bill.title,
					success: true,
				};
			});

			await logFinanceActivity(ctx, {
				title: "Payable owing repaid",
				description: result.title || "Owing repayment posted",
				meta: {
					billId: result.billId,
					repaidAmount: result.repaidAmount,
					outstandingOwing: result.outstandingOwing,
				},
			});

			return result;
		}),

	cancelServiceBillPayment: financeWriteProcedure
		.input(cancelBillPaymentSchema)
		.mutation(async ({ input, ctx }) => {
			const current = await tryGetCurrentUserContext(ctx);
			const result = await ctx.db.$transaction(async (tx) => {
				return cancelBillPayment(tx, {
					billId: input.billId,
				});
			});

			if (current) {
				await dispatchSchoolNotification(ctx, {
					audience: "finance",
					type: "service_payment_cancelled",
					payload: {
						actorName: current.user.name,
						amount: formatNaira(result.amount),
						expenseTitle: result.title || "Service payment",
						link: "/finance/payments",
						schoolName: current.school.name,
					},
				});
			}

			await logFinanceActivity(ctx, {
				title: "Service payment cancelled",
				description: result.title || "Service payment reversed",
				meta: {
					billId: input.billId,
					amount: result.amount,
				},
			});

			return result;
		}),

	// ── Payroll ─────────────────────────────────────────────────────────────────

	getPayroll: financeReadProcedure
		.input(z.object({ termId: z.string().optional().nullable() }))
		.query(async ({ input, ctx }) => {
			const termId = input.termId || ctx.profile.termId;
			return ctx.db.bills.findMany({
				where: {
					schoolProfileId: ctx.profile.schoolId,
					sessionTermId: termId!,
					staffTermProfileId: { not: null },
					deletedAt: null,
				},
				select: {
					id: true,
					title: true,
					description: true,
					amount: true,
					walletId: true,
					billPaymentId: true,
					createdAt: true,
					wallet: {
						select: { id: true, name: true },
					},
					staffTermProfile: {
						select: {
							id: true,
							staffProfile: {
								select: { id: true, name: true, title: true },
							},
						},
					},
					billPayment: {
						select: {
							id: true,
							deletedAt: true,
							amount: true,
							invoice: {
								select: {
									id: true,
									amount: true,
									deletedAt: true,
								},
							},
							settlement: {
								select: {
									id: true,
									owingAmount: true,
									status: true,
									deletedAt: true,
								},
							},
							transaction: {
								select: {
									id: true,
									amount: true,
									transactionDate: true,
									status: true,
								},
							},
						},
					},
				},
				orderBy: [
					{
						staffTermProfile: {
							staffProfile: { name: "asc" },
						},
					},
					{ createdAt: "desc" },
				],
			});
		}),

	createStaffBill: financeWriteProcedure
		.input(
			z.object({
				staffProfileId: z.string(),
				title: z.string().min(1),
				streamId: z.string().optional().nullable(),
				streamName: z.string().optional().nullable(),
				description: z.string().optional().nullable(),
				amount: z.number().positive(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const bill = await ctx.db.$transaction(async (tx) => {
				let termProfile = await tx.staffTermProfile.findFirst({
					where: {
						staffProfileId: input.staffProfileId,
						sessionTermId: ctx.profile.termId!,
						schoolSessionId: ctx.profile.sessionId!,
						deletedAt: null,
					},
					select: { id: true },
				});

				if (!termProfile) {
					termProfile = await tx.staffTermProfile.create({
						data: {
							staffProfileId: input.staffProfileId,
							sessionTermId: ctx.profile.termId!,
							schoolSessionId: ctx.profile.sessionId!,
						},
						select: { id: true },
					});
				}

				const existingWallet = input.streamId
					? await tx.wallet.findFirst({
							where: {
								id: input.streamId,
								schoolProfileId: ctx.profile.schoolId,
								sessionTermId: ctx.profile.termId,
								deletedAt: null,
							},
							select: { id: true, name: true },
						})
					: null;

				const resolvedStreamName = input.streamName?.trim() || input.title.trim();

				const wallet =
					existingWallet ||
					(await tx.wallet.upsert({
						where: {
							name_schoolProfileId_sessionTermId_type: {
								name: resolvedStreamName,
								schoolProfileId: ctx.profile.schoolId!,
								sessionTermId: ctx.profile.termId!,
								type: "bill",
							},
						},
						update: { defaultType: "outgoing" } as any,
						create: {
							name: resolvedStreamName,
							type: "bill",
							defaultType: "outgoing",
							schoolProfileId: ctx.profile.schoolId!,
							sessionTermId: ctx.profile.termId!,
						} as any,
						select: { id: true, name: true },
					}));

				return tx.bills.create({
					data: {
						title: resolvedStreamName,
						description: input.description,
						amount: input.amount,
						schoolProfileId: ctx.profile.schoolId!,
						schoolSessionId: ctx.profile.sessionId!,
						sessionTermId: ctx.profile.termId!,
						staffTermProfileId: termProfile.id,
						walletId: wallet.id,
					},
					select: { id: true },
				});
			});

			await logFinanceActivity(ctx, {
				title: "Payroll payable created",
				description: input.title,
				meta: {
					billId: bill.id,
					staffProfileId: input.staffProfileId,
					amount: input.amount,
				},
			});

			return bill;
		}),

	payStaffBill: financeWriteProcedure
		.input(payBillSchema)
		.mutation(async ({ input, ctx }) => {
			const current = await tryGetCurrentUserContext(ctx);
			const result = await ctx.db.$transaction(async (tx) => {
				return payBill(tx, {
					billId: input.billId,
					amount: input.amount,
					date: input.date,
					schoolId: ctx.profile.schoolId!,
					termId: ctx.profile.termId!,
				});
			});

			if (current) {
				await dispatchSchoolNotification(ctx, {
					audience: "payroll",
					type: "payroll_payment_recorded",
					payload: {
						actorName: current.user.name,
						amount: formatNaira(result.amount),
						link: "/staff/payroll",
						schoolName: current.school.name,
						staffName: result.staffName || result.title || "Staff member",
					},
				});
			}

			await logFinanceActivity(ctx, {
				title: "Payroll paid",
				description: result.staffName || result.title || "Payroll payment issued",
				meta: {
					billId: input.billId,
					amount: result.amount,
					fundedAmount: result.fundedAmount,
					owingAmount: result.owingAmount,
				},
			});

			return result;
		}),

	cancelStaffBillPayment: financeWriteProcedure
		.input(cancelBillPaymentSchema)
		.mutation(async ({ input, ctx }) => {
			const current = await tryGetCurrentUserContext(ctx);
			const result = await ctx.db.$transaction(async (tx) => {
				return cancelBillPayment(tx, {
					billId: input.billId,
				});
			});

			if (current) {
				await dispatchSchoolNotification(ctx, {
					audience: "payroll",
					type: "payroll_payment_cancelled",
					payload: {
						actorName: current.user.name,
						amount: formatNaira(result.amount),
						link: "/staff/payroll",
						schoolName: current.school.name,
						staffName: result.staffName || result.title || "Staff member",
					},
				});
			}

			await logFinanceActivity(ctx, {
				title: "Payroll payment cancelled",
				description: result.staffName || result.title || "Payroll reversal posted",
				meta: {
					billId: input.billId,
					amount: result.amount,
				},
			});

			return result;
		}),

	// ── Staff list (for payroll form) ───────────────────────────────────────────

	getStaff: financeReadProcedure.query(async ({ ctx }) => {
		return ctx.db.staffProfile.findMany({
			where: { schoolProfileId: ctx.profile.schoolId, deletedAt: null },
			select: { id: true, name: true, title: true },
			orderBy: { name: "asc" },
		});
	}),

	// ── Student Payments ────────────────────────────────────────────────────────

	searchStudentsForPayment: financeReadProcedure
		.input(z.object({ query: z.string().optional().nullable() }).optional())
		.query(async ({ input, ctx }) => {
			const query = input?.query?.trim();
			const students = await ctx.db.students.findMany({
				where: {
					schoolProfileId: ctx.profile.schoolId,
					deletedAt: null,
					...(query
						? {
								OR: [
									{ name: { contains: query, mode: "insensitive" } },
									{ surname: { contains: query, mode: "insensitive" } },
									{ otherName: { contains: query, mode: "insensitive" } },
								],
							}
						: {}),
				},
				take: 12,
				orderBy: [{ name: "asc" }, { surname: "asc" }],
				select: {
					id: true,
					name: true,
					surname: true,
					otherName: true,
					termForms: {
						where: {
							sessionTermId: ctx.profile.termId,
							deletedAt: null,
						},
						take: 1,
						select: {
							id: true,
							classroomDepartment: {
								select: {
									departmentName: true,
									classRoom: { select: { name: true } },
								},
							},
							sessionTerm: {
								select: {
									title: true,
									session: { select: { title: true } },
								},
							},
						},
					},
				},
			});

			return Promise.all(
				students.map(async (student) => {
					const currentTermForm = student.termForms[0];
					const latestTermForm =
						currentTermForm ||
						(await ctx.db.studentTermForm.findFirst({
							where: {
								studentId: student.id,
								deletedAt: null,
							},
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
									select: {
										title: true,
										session: { select: { title: true } },
									},
								},
							},
						}));

					return {
						id: student.id,
						name: getStudentName(student),
						classroom: getDepartmentName(latestTermForm?.classroomDepartment),
						currentTermLabel:
							latestTermForm?.sessionTerm?.title &&
							latestTermForm?.sessionTerm?.session?.title
								? `${latestTermForm.sessionTerm.title} • ${latestTermForm.sessionTerm.session.title}`
								: null,
						hasCurrentTermSheet: Boolean(currentTermForm),
					};
				}),
			);
		}),

	getReceivePaymentData: financeReadProcedure
		.input(z.object({ studentId: z.string() }))
		.query(async ({ input, ctx }) => {
			return getStudentReceivePaymentData(ctx, input.studentId);
		}),

	getStudentPayments: financeReadProcedure
		.input(
			z.object({
				studentId: z.string().optional().nullable(),
				termId: z.string().optional().nullable(),
			}),
		)
		.query(async ({ input, ctx }) => {
			if (!input.studentId) return [];
			return ctx.db.studentPayment.findMany({
				where: {
					schoolProfileId: ctx.profile.schoolId,
					deletedAt: null,
					studentTermForm: {
						student: { id: input.studentId },
						sessionTermId: input.termId || undefined,
					},
				},
				select: {
					id: true,
					amount: true,
					status: true,
					paymentType: true,
					description: true,
					type: true,
					createdAt: true,
					studentFee: { select: { feeTitle: true } },
					walletTransaction: {
						select: {
							id: true,
							summary: true,
							transactionDate: true,
							status: true,
						},
					},
				},
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			});
		}),

	reverseStudentPayment: financeWriteProcedure
		.input(
			z.object({
				studentPaymentId: z.string(),
				transactionId: z.string(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const current = await tryGetCurrentUserContext(ctx);
			const result = await ctx.db.$transaction(async (tx) => {
				await tx.walletTransactions.update({
					where: { id: input.transactionId },
					data: { status: "cancelled" },
				});
				const payment = await tx.studentPayment.update({
					where: { id: input.studentPaymentId },
					data: { status: "cancelled" },
					select: {
						amount: true,
						studentTermForm: {
							select: {
								student: {
									select: {
										name: true,
										otherName: true,
										surname: true,
									},
								},
							},
						},
						studentFee: { select: { id: true } },
					},
				});
				if (payment.studentFee?.id && payment.amount) {
					await tx.studentFee.update({
						where: { id: payment.studentFee.id },
						data: { pendingAmount: { increment: payment.amount } },
					});
				}
				return {
					amount: payment.amount ?? 0,
						studentName: getStudentName(payment.studentTermForm.student ?? undefined),
					success: true,
				};
			});

			if (current) {
				await dispatchSchoolNotification(ctx, {
					audience: "finance",
					type: "student_payment_cancelled",
					payload: {
						actorName: current.user.name,
						amount: formatNaira(result.amount),
						link: "/finance/transactions",
						schoolName: current.school.name,
						studentName: result.studentName,
					},
				});
			}

			await ctx.db.activity.create({
				data: {
					userId: ctx.currentUser!.id,
					author: ctx.currentUser!.name,
					schoolProfileId: ctx.profile.schoolId,
					source: "user",
					type: "student_payment_cancelled",
					title: "Student payment cancelled",
					description: `${result.studentName} payment cancellation recorded`,
					meta: {
						amount: result.amount,
						studentName: result.studentName,
						studentPaymentId: input.studentPaymentId,
						transactionId: input.transactionId,
					},
				},
			});

			return result;
		}),

	receiveStudentPayment: financeWriteProcedure
		.input(receivePaymentSchema)
		.mutation(async ({ input, ctx }) => {
			const totalAllocated = input.allocations.reduce(
				(sum, allocation) => sum + allocation.amountToPay,
				0,
			);

			if (Math.abs(totalAllocated - input.amountReceived) > 0.001) {
				throw new Error("Allocated total must match the amount received.");
			}

			const normalizedAllocationMap = input.allocations.reduce(
				(map, allocation) => {
					const targetTermFormId =
						allocation.studentTermFormId || input.studentTermFormId;
					const key = JSON.stringify({
						source: allocation.source,
						studentTermFormId: targetTermFormId,
						studentFeeId: allocation.studentFeeId || null,
						billableHistoryId: allocation.billableHistoryId || null,
						feeHistoryId: allocation.feeHistoryId || null,
						streamId: allocation.streamId || null,
						streamName: allocation.streamName || null,
						title:
							allocation.source === "manual"
								? allocation.title?.trim() || null
								: null,
						description:
							allocation.source === "manual"
								? allocation.description?.trim() || null
								: null,
					});
					const existing = map.get(key);

					if (!existing) {
						map.set(key, {
							...allocation,
							studentTermFormId: targetTermFormId,
						});
						return map;
					}

					if (
						existing.amountDue !== allocation.amountDue ||
						(existing.title || "") !== (allocation.title || "") ||
						(existing.description || "") !== (allocation.description || "")
					) {
						throw new Error(
							"Conflicting duplicate payment allocations were detected.",
						);
					}

					map.set(key, {
						...existing,
						amountToPay: existing.amountToPay + allocation.amountToPay,
					});
					return map;
				},
				new Map<string, (typeof input.allocations)[number]>(),
			);
			const normalizedAllocations = Array.from(
				normalizedAllocationMap.values(),
			);

			const current = await tryGetCurrentUserContext(ctx);
			const result = await ctx.db.$transaction(
				async (tx) => {
					const termFormIds = Array.from(
						new Set(
							normalizedAllocations
								.map((allocation) => allocation.studentTermFormId)
								.filter(Boolean)
								.concat(input.studentTermFormId),
						),
					);
					const studentTermForms = await tx.studentTermForm.findMany({
						where: {
							id: { in: termFormIds as string[] },
							studentId: input.studentId,
							schoolProfileId: ctx.profile.schoolId,
							deletedAt: null,
						},
						select: {
							id: true,
							studentId: true,
							schoolSessionId: true,
							sessionTermId: true,
							classroomDepartmentId: true,
							student: {
								select: {
									name: true,
									otherName: true,
									surname: true,
								},
							},
						},
					});
					const studentTermFormMap = new Map(
						studentTermForms.map((termForm) => [termForm.id, termForm]),
					);
					const primaryStudentTermForm = studentTermFormMap.get(
						input.studentTermFormId,
					);

					if (!primaryStudentTermForm) {
						throw new Error("Student term form not found for this payment.");
					}

					const resolveWalletId = async (
						allocation: (typeof normalizedAllocations)[number],
						fallbackName: string,
					) => {
						if (allocation.streamId) {
							const wallet = await tx.wallet.findFirst({
								where: {
									id: allocation.streamId,
									schoolProfileId: ctx.profile.schoolId,
									deletedAt: null,
								},
								select: { id: true },
							});
							if (!wallet) {
								throw new Error("Selected stream could not be resolved.");
							}
							return wallet.id;
						}

						if (allocation.streamName?.trim()) {
							return (
								await getOrCreateWallet(tx, {
									name: allocation.streamName.trim(),
									type: "fee",
									schoolId: ctx.profile.schoolId!,
									termId: ctx.profile.termId!,
								})
							).id;
						}

						return (
							await getOrCreateWallet(tx, {
								name: fallbackName || "General",
								type: "fee",
								schoolId: ctx.profile.schoolId!,
								termId: ctx.profile.termId!,
							})
						).id;
					};

					const createdPayments: Array<{
						id: string;
						amount: number | null;
						paymentType: string;
					}> = [];

					for (const allocation of normalizedAllocations) {
						const studentTermForm = studentTermFormMap.get(
							allocation.studentTermFormId || input.studentTermFormId,
						);
						if (!studentTermForm) {
							throw new Error("Student term form not found for one allocation.");
						}

						let studentFeeId = allocation.studentFeeId || null;
						let feeTitle = allocation.title || "Payment";
						let walletId: string | null = null;

						if (allocation.source === "studentFee") {
							const fee = await tx.studentFee.findFirstOrThrow({
								where: {
									id: allocation.studentFeeId || undefined,
									studentTermFormId: studentTermForm.id,
									deletedAt: null,
									status: { not: "cancelled" },
								},
								select: {
									id: true,
									feeTitle: true,
									pendingAmount: true,
									billAmount: true,
									feeHistory: {
										select: {
											walletId: true,
										},
									},
								},
							});

							if (allocation.amountToPay > fee.pendingAmount) {
								throw new Error(
									`Payment for ${fee.feeTitle || "charge"} exceeds the pending amount.`,
								);
							}

							studentFeeId = fee.id;
							feeTitle = fee.feeTitle || feeTitle;
							walletId = await resolveWalletId(
								allocation,
								fee.feeTitle || feeTitle || "General",
							);
							if (!allocation.streamId && !allocation.streamName && !fee.feeHistory?.walletId) {
								walletId = await resolveWalletId(
									{ ...allocation, streamId: null, streamName: null },
									feeTitle || "General",
								);
							} else if (
								!allocation.streamId &&
								!allocation.streamName &&
								fee.feeHistory?.walletId
							) {
								walletId = fee.feeHistory.walletId;
							}
						}

						if (allocation.source === "billable") {
							const history = await tx.billableHistory.findFirstOrThrow({
								where: {
									id: allocation.billableHistoryId || undefined,
									termId: ctx.profile.termId,
									current: true,
									deletedAt: null,
								},
								select: {
									id: true,
									amount: true,
									walletId: true,
									billable: {
										select: {
											title: true,
											description: true,
										},
									},
								},
							});

							let existingFee = await tx.studentFee.findFirst({
								where: {
									studentTermFormId: studentTermForm.id,
									billablePriceId: history.id,
									deletedAt: null,
									status: { not: "cancelled" },
								},
								select: {
									id: true,
									pendingAmount: true,
									feeTitle: true,
								},
							});

							if (!existingFee) {
								existingFee = await tx.studentFee.create({
									data: {
										billAmount: history.amount,
										pendingAmount: history.amount,
										feeTitle: history.billable.title,
										description: history.billable.description,
										billablePriceId: history.id,
										schoolProfileId: ctx.profile.schoolId!,
										studentTermFormId: studentTermForm.id,
										schoolSessionId: studentTermForm.schoolSessionId,
										studentId: input.studentId,
										status: "active",
									},
									select: {
										id: true,
										pendingAmount: true,
										feeTitle: true,
									},
								});
							}

							if (allocation.amountToPay > existingFee.pendingAmount) {
								throw new Error(
									`Payment for ${existingFee.feeTitle || history.billable.title} exceeds the pending amount.`,
								);
							}

							const fallbackWallet =
								history.walletId ||
								(
									await getOrCreateWallet(tx, {
										name: history.billable.title || "General",
										type: "fee",
										schoolId: ctx.profile.schoolId!,
										termId: ctx.profile.termId!,
									})
								).id;

							walletId =
								allocation.streamId || allocation.streamName
									? await resolveWalletId(
											allocation,
											history.billable.title || "General",
										)
									: fallbackWallet;
							studentFeeId = existingFee.id;
							feeTitle =
								existingFee.feeTitle || history.billable.title || feeTitle;
						}

						if (allocation.source === "feeHistory") {
							const fh = await tx.feeHistory.findFirstOrThrow({
								where: {
									id: allocation.feeHistoryId || undefined,
									termId: ctx.profile.termId,
									current: true,
									deletedAt: null,
								},
								select: {
									id: true,
									amount: true,
									walletId: true,
									classroomDepartments: {
										where: { deletedAt: null },
										select: { id: true },
									},
									fee: { select: { title: true, description: true } },
								},
							});

							if (
								fh.classroomDepartments.length > 0 &&
								!fh.classroomDepartments.some(
									(department) =>
										department.id === studentTermForm.classroomDepartmentId,
								)
							) {
								throw new Error(
									"This fee does not apply to the student's current classroom.",
								);
							}

							let existingFee = await tx.studentFee.findFirst({
								where: {
									studentTermFormId: studentTermForm.id,
									feeHistoryId: fh.id,
									deletedAt: null,
									status: { not: "cancelled" },
								},
								select: { id: true, pendingAmount: true, feeTitle: true },
							});

							if (!existingFee) {
								existingFee = await tx.studentFee.create({
									data: {
										billAmount: fh.amount,
										pendingAmount: fh.amount,
										feeTitle: fh.fee.title,
										description: fh.fee.description,
										feeHistoryId: fh.id,
										schoolProfileId: ctx.profile.schoolId!,
										studentTermFormId: studentTermForm.id,
										schoolSessionId: studentTermForm.schoolSessionId,
										studentId: input.studentId,
										status: "active",
									},
									select: { id: true, pendingAmount: true, feeTitle: true },
								});
							}

							if (allocation.amountToPay > existingFee.pendingAmount) {
								throw new Error(
									`Payment for ${existingFee.feeTitle || fh.fee.title} exceeds the pending amount.`,
								);
							}

							const fallbackWallet =
								fh.walletId ||
								(
									await getOrCreateWallet(tx, {
										name: fh.fee.title || "General",
										type: "fee",
										schoolId: ctx.profile.schoolId!,
										termId: ctx.profile.termId!,
									})
								).id;

							walletId =
								allocation.streamId || allocation.streamName
									? await resolveWalletId(
											allocation,
											fh.fee.title || "General",
										)
									: fallbackWallet;

							studentFeeId = existingFee.id;
							feeTitle = existingFee.feeTitle || fh.fee.title || feeTitle;
						}

						if (allocation.source === "manual") {
							const manualFee = await tx.studentFee.create({
								data: {
									billAmount: allocation.amountDue,
									pendingAmount: allocation.amountDue,
									feeTitle: allocation.title || "Manual Charge",
									description: allocation.description,
									schoolProfileId: ctx.profile.schoolId!,
									studentTermFormId: studentTermForm.id,
									schoolSessionId: studentTermForm.schoolSessionId,
									studentId: input.studentId,
									status: "active",
								},
								select: {
									id: true,
									feeTitle: true,
									pendingAmount: true,
								},
							});

							studentFeeId = manualFee.id;
							feeTitle = manualFee.feeTitle || feeTitle;
							walletId = await resolveWalletId(
								allocation,
								allocation.title || manualFee.feeTitle || "Sales",
							);
						}

						if (!studentFeeId || !walletId) {
							throw new Error("Could not resolve the selected payment line.");
						}

						const walletTransaction = await tx.walletTransactions.create({
							data: {
								amount: allocation.amountToPay,
								walletId,
								type: "credit",
								summary: [input.paymentMethod, input.reference]
									.filter(Boolean)
									.join(" • "),
								status: "success",
								transactionDate: input.paymentDate ?? new Date(),
								studentWalletTransaction: {
									create: {
										studentId: input.studentId,
										amount: allocation.amountToPay,
										transactionType: "debit",
										status: "success",
										description: feeTitle,
										transactionDate: input.paymentDate ?? new Date(),
									},
								},
							},
							select: { id: true },
						});

						const payment = await tx.studentPayment.create({
							data: {
								type: "FEE",
								paymentType: feeTitle,
								amount: allocation.amountToPay,
								status: "success",
								description: [input.paymentMethod, input.reference]
									.filter(Boolean)
									.join(" • "),
								schoolProfileId: ctx.profile.schoolId!,
								studentTermFormId: studentTermForm.id,
								studentBillPaymentsId: studentFeeId,
								walletTransactionsId: walletTransaction.id,
							},
							select: {
								id: true,
								amount: true,
								paymentType: true,
							},
						});

						await tx.studentFee.update({
							where: { id: studentFeeId },
							data: {
								pendingAmount: {
									decrement: allocation.amountToPay,
								},
							},
						});

						createdPayments.push(payment);
					}

					return {
						success: true,
						count: createdPayments.length,
						studentName: getStudentName(
							primaryStudentTermForm.student ?? undefined,
						),
						totalAllocated,
						paymentIds: createdPayments.map((payment) => payment.id),
					};
				},
				{
					maxWait: 10000,
					timeout: 20000,
				},
			);

			if (current) {
				await dispatchSchoolNotification(ctx, {
					audience: "finance",
					type: "student_payment_received",
					payload: {
						actorName: current.user.name,
						amount: formatNaira(result.totalAllocated),
						link: "/finance/transactions",
						paymentMethod: input.paymentMethod,
						schoolName: current.school.name,
						studentName: result.studentName,
					},
				});
			}

			await ctx.db.activity.create({
				data: {
					userId: ctx.currentUser!.id,
					author: ctx.currentUser!.name,
					schoolProfileId: ctx.profile.schoolId,
					source: "user",
					type: "student_payment_received",
					title: "Student payment received",
					description: `${result.studentName} payment recorded`,
					meta: {
						amount: result.totalAllocated,
						studentName: result.studentName,
						paymentIds: result.paymentIds,
						paymentMethod: input.paymentMethod,
						reference: input.reference,
					},
				},
			});

			return result;
		}),

	// ── Billables ───────────────────────────────────────────────────────────────

	getBillables: financeReadProcedure
		.input(z.object({ termId: z.string().optional().nullable() }).optional())
		.query(async ({ input, ctx }) => {
			const termId = input?.termId || ctx.profile.termId;
			const billables = await ctx.db.billable.findMany({
				where: {
					schoolProfileId: ctx.profile.schoolId,
					deletedAt: null,
				},
				select: {
					id: true,
					title: true,
					description: true,
					amount: true,
					type: true,
					billableHistory: {
						where: { current: true, termId: termId || undefined },
						take: 1,
						select: {
							id: true,
							amount: true,
							wallet: { select: { id: true, name: true } },
							classroomDepartments: {
								where: { deletedAt: null },
								select: {
									id: true,
									departmentName: true,
									classRoom: { select: { name: true } },
								},
							},
						},
					},
				},
				orderBy: { title: "asc" },
			});
			return billables.map((b) => ({
				id: b.id,
				title: b.title,
				description: b.description,
				amount: b.billableHistory?.[0]?.amount ?? b.amount,
				type: b.type,
				historyId: b.billableHistory?.[0]?.id,
				streamId: b.billableHistory?.[0]?.wallet?.id ?? null,
				streamName: b.billableHistory?.[0]?.wallet?.name ?? null,
				classroomDepartments:
					b.billableHistory?.[0]?.classroomDepartments.map((department) => ({
						id: department.id,
						name: getDepartmentName(department),
					})) ?? [],
			}));
		}),

	createBillable: financeWriteProcedure
		.input(
			z.object({
				billableId: z.string().optional().nullable(),
				title: z.string().min(1),
				amount: z.number().min(1),
				description: z.string().optional().nullable(),
				type: z.enum(["SALARY", "MISC", "OTHER"]).default("OTHER"),
				streamId: z.string().optional().nullable(),
				streamName: z.string().optional().nullable(),
				classroomDepartmentIds: z.array(z.string()).default([]),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			let savedBillableId: string;

			const existingBillable = input.billableId
				? await ctx.db.billable.findFirst({
						where: {
							id: input.billableId,
							schoolProfileId: ctx.profile.schoolId,
							deletedAt: null,
						},
						select: {
							id: true,
							billableHistory: {
								where: {
									current: true,
									termId: ctx.profile.termId,
									deletedAt: null,
								},
								take: 1,
								select: { id: true },
							},
						},
					})
				: null;

			const wallet = input.streamId
				? await ctx.db.wallet.findFirst({
						where: {
							id: input.streamId,
							schoolProfileId: ctx.profile.schoolId,
							sessionTermId: ctx.profile.termId,
							deletedAt: null,
						},
						select: { id: true },
					})
				: null;

			const resolvedWallet =
				wallet ||
				(input.streamName?.trim()
					? await getOrCreateWallet(ctx.db, {
							name: input.streamName.trim(),
							type: "fee",
							schoolId: ctx.profile.schoolId!,
							termId: ctx.profile.termId!,
						})
					: null);

			if (existingBillable) {
				const currentHistory = existingBillable.billableHistory[0];
				savedBillableId = existingBillable.id;

				await ctx.db.billable.update({
					where: { id: existingBillable.id },
					data: {
						title: input.title,
						amount: input.amount,
						description: input.description,
						type: input.type,
					},
				});

				if (currentHistory) {
					await ctx.db.billableHistory.update({
						where: { id: currentHistory.id },
						data: {
							amount: input.amount,
							walletId: resolvedWallet?.id ?? null,
							classroomDepartments: {
								set: input.classroomDepartmentIds.map((id) => ({ id })),
							},
						},
					});
				} else {
					await ctx.db.billable.update({
					where: { id: existingBillable.id },
					data: {
						billableHistory: {
							create: {
								amount: input.amount,
								current: true,
								schoolSessionId: ctx.profile.sessionId!,
								termId: ctx.profile.termId!,
								walletId: resolvedWallet?.id,
								classroomDepartments: input.classroomDepartmentIds.length
									? {
											connect: input.classroomDepartmentIds.map((id) => ({
												id,
											})),
										}
									: undefined,
							},
						},
					},
					});
				}
			} else {
				const createdBillable = await ctx.db.billable.create({
					data: {
						title: input.title,
						amount: input.amount,
						description: input.description,
						type: input.type,
						schoolProfileId: ctx.profile.schoolId!,
						billableHistory: {
							create: {
								amount: input.amount,
								current: true,
								schoolSessionId: ctx.profile.sessionId!,
								termId: ctx.profile.termId!,
								walletId: resolvedWallet?.id,
								classroomDepartments: input.classroomDepartmentIds.length
									? {
											connect: input.classroomDepartmentIds.map((id) => ({ id })),
										}
									: undefined,
							},
						},
					},
					select: { id: true },
				});
				savedBillableId = createdBillable.id;
			}

				const savedBillable = await ctx.db.billable.findFirstOrThrow({
				where: {
					id: savedBillableId,
					schoolProfileId: ctx.profile.schoolId,
					deletedAt: null,
				},
				select: {
					id: true,
					title: true,
					description: true,
					amount: true,
					type: true,
					billableHistory: {
						where: {
							current: true,
							termId: ctx.profile.termId,
							deletedAt: null,
						},
						take: 1,
						select: {
							id: true,
							amount: true,
							wallet: { select: { id: true, name: true } },
							classroomDepartments: {
								select: {
									id: true,
									departmentName: true,
									classRoom: { select: { name: true } },
								},
							},
						},
					},
					},
				});

				await logFinanceActivity(ctx, {
					title: existingBillable ? "Service billable updated" : "Service billable created",
					description: savedBillable.title,
					meta: {
						billableId: savedBillable.id,
						amount: savedBillable.billableHistory?.[0]?.amount ?? savedBillable.amount,
					},
				});

				return {
				id: savedBillable.id,
				title: savedBillable.title,
				description: savedBillable.description,
				amount: savedBillable.billableHistory?.[0]?.amount ?? savedBillable.amount,
				type: savedBillable.type,
				historyId: savedBillable.billableHistory?.[0]?.id,
				streamId: savedBillable.billableHistory?.[0]?.wallet?.id ?? null,
				streamName: savedBillable.billableHistory?.[0]?.wallet?.name ?? null,
				classroomDepartments:
					savedBillable.billableHistory?.[0]?.classroomDepartments.map(
						(department) => ({
							id: department.id,
							name: getDepartmentName(department),
						}),
					) ?? [],
			};
		}),

	deleteBillable: financeWriteProcedure
		.input(
			z.object({
				billableId: z.string(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const billable = await ctx.db.billable.findFirstOrThrow({
				where: {
					id: input.billableId,
					schoolProfileId: ctx.profile.schoolId,
					deletedAt: null,
				},
				select: {
					id: true,
					title: true,
				},
			});

				await ctx.db.billable.update({
				where: { id: billable.id },
				data: {
					deletedAt: new Date(),
					billableHistory: {
						updateMany: {
							where: { deletedAt: null },
							data: {
								deletedAt: new Date(),
								current: false,
							},
						},
					},
				},
				});

				await logFinanceActivity(ctx, {
					title: "Service billable deleted",
					description: billable.title,
					meta: {
						billableId: billable.id,
					},
				});

				return {
				success: true,
				title: billable.title,
			};
		}),

	generateBillsFromBillables: financeWriteProcedure
		.input(generateBillsFromBillablesSchema)
		.mutation(async ({ input, ctx }) => {
			const termId = input.termId || ctx.profile.termId!;
			const histories = await ctx.db.billableHistory.findMany({
				where: {
					termId,
					current: true,
					deletedAt: null,
					billable: {
						schoolProfileId: ctx.profile.schoolId,
						deletedAt: null,
						...(input.billableIds?.length
							? { id: { in: input.billableIds } }
							: {}),
					},
				},
				select: {
					id: true,
					amount: true,
					walletId: true,
					billable: {
						select: {
							id: true,
							title: true,
							description: true,
						},
					},
				},
			});

			const created: Array<{ id: string; title: string }> = [];
			const skipped: Array<{ historyId: string; title: string; reason: string }> = [];

			await ctx.db.$transaction(async (tx) => {
				for (const history of histories) {
					const existingBill = await tx.bills.findFirst({
						where: {
							schoolProfileId: ctx.profile.schoolId,
							sessionTermId: termId,
							billableHistoryId: history.id,
							deletedAt: null,
							OR: [
								{ billPaymentId: null },
								{
									billPayment: {
										deletedAt: null,
									},
								},
							],
						},
						select: { id: true },
					});

					if (existingBill) {
						skipped.push({
							historyId: history.id,
							title: history.billable.title,
							reason: "A payable already exists for this billable history.",
						});
						continue;
					}

					const walletId =
						history.walletId ||
						(
							await getOrCreateWallet(tx, {
								name: history.billable.title,
								type: "bill",
								schoolId: ctx.profile.schoolId!,
								termId,
							})
						).id;

					const bill = await tx.bills.create({
						data: {
							title: history.billable.title,
							description: history.billable.description,
							amount: history.amount,
							billableId: history.billable.id,
							billableHistoryId: history.id,
							walletId,
							schoolProfileId: ctx.profile.schoolId!,
							schoolSessionId: ctx.profile.sessionId!,
							sessionTermId: termId,
						},
						select: { id: true, title: true },
					});

					created.push(bill);
				}
			});

			await logFinanceActivity(ctx, {
				title: "Billables generated into payables",
				description: `${created.length} payables created from service billables`,
				meta: {
					createdCount: created.length,
					skippedCount: skipped.length,
					termId,
				},
			});

			return {
				success: true,
				created,
				skipped,
			};
		}),

	backfillBillSettlements: financeWriteProcedure
		.input(financeReportFilterSchema.optional())
		.mutation(async ({ input, ctx }) => {
			const termId = input?.termId || ctx.profile.termId!;
			const bills = await ctx.db.bills.findMany({
				where: {
					schoolProfileId: ctx.profile.schoolId,
					sessionTermId: termId,
					deletedAt: null,
					billPaymentId: { not: null },
				},
				select: { id: true },
			});

			let hydrated = 0;
			for (const bill of bills) {
				const settlement = await getOrCreateLegacySettlement(ctx.db, {
					billId: bill.id,
				});
				if (settlement?.id) hydrated += 1;
			}

			await logFinanceActivity(ctx, {
				title: "Legacy bill settlements backfilled",
				description: `${hydrated} payable settlements are now settlement-backed`,
				meta: {
					termId,
					hydrated,
				},
			});

			return {
				success: true,
				hydrated,
			};
		}),

	// ── Bills ────────────────────────────────────────────────────────────────────

	getBills: financeReadProcedure
		.input(z.object({ termId: z.string().optional().nullable() }).optional())
		.query(async ({ input, ctx }) => {
			const termId = input?.termId || ctx.profile.termId;
			const bills = await ctx.db.bills.findMany({
				where: {
					schoolProfileId: ctx.profile.schoolId,
					sessionTermId: termId!,
					deletedAt: null,
				},
				select: {
					id: true,
					title: true,
					amount: true,
					description: true,
					billPaymentId: true,
					billable: { select: { description: true } },
					staffTermProfile: {
						select: { staffProfile: { select: { name: true, id: true } } },
					},
					sessionTerm: { select: { title: true, id: true } },
				},
				orderBy: { createdAt: "desc" },
			});
			return bills.map((b) => ({
				id: b.id,
				title: b.staffTermProfile
					? b.staffTermProfile.staffProfile?.name
					: b.title,
				description: b.description,
				amount: b.amount,
				status: b.billPaymentId ? "PAID" : "PENDING",
				termTitle: b.sessionTerm?.title,
			}));
		}),

	createBill: financeWriteProcedure
		.input(
			z.object({
				title: z.string().min(1),
				amount: z.number().min(1),
				streamId: z.string().optional().nullable(),
				streamName: z.string().optional().nullable(),
				billableId: z.string().optional().nullable(),
				billableHistoryId: z.string().optional().nullable(),
				staffTermProfileId: z.string().optional().nullable(),
				description: z.string().optional().nullable(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const existingWallet = input.streamId
				? await ctx.db.wallet.findFirst({
						where: {
							id: input.streamId,
							schoolProfileId: ctx.profile.schoolId,
							sessionTermId: ctx.profile.termId,
							deletedAt: null,
						},
						select: { id: true, name: true },
					})
				: null;
			const streamName = input.streamName?.trim() || input.title || "General";
			const wallet =
				existingWallet ||
				(await ctx.db.wallet.upsert({
					where: {
						name_schoolProfileId_sessionTermId_type: {
							name: streamName,
							schoolProfileId: ctx.profile.schoolId!,
							sessionTermId: ctx.profile.termId!,
							type: "bill",
						},
					},
					update: { defaultType: "outgoing" } as any,
					create: {
						name: streamName,
						type: "bill",
						defaultType: "outgoing",
						schoolProfileId: ctx.profile.schoolId!,
						sessionTermId: ctx.profile.termId!,
					} as any,
					select: { id: true, name: true },
				}));
				const bill = await ctx.db.bills.create({
					data: {
					title: streamName,
					description: input.description,
					amount: input.amount,
					sessionTermId: ctx.profile.termId!,
					schoolProfileId: ctx.profile.schoolId!,
					schoolSessionId: ctx.profile.sessionId!,
					walletId: wallet.id,
					billableId: input.billableId || undefined,
					billableHistoryId: input.billableHistoryId || undefined,
					staffTermProfileId: input.staffTermProfileId || undefined,
				},
				});

				await logFinanceActivity(ctx, {
					title: "Bill created",
					description: input.title,
					meta: {
						billId: bill.id,
						amount: input.amount,
						streamName,
					},
				});

				return bill;
			}),

	// ── Transactions ─────────────────────────────────────────────────────────────

	getTransactions: financeReadProcedure
		.input(z.object({ termId: z.string().optional().nullable() }).optional())
		.query(async ({ input, ctx }) => {
			const termId = input?.termId || ctx.profile.termId;
			const txs = await ctx.db.walletTransactions.findMany({
				where: {
					wallet: {
						schoolProfileId: ctx.profile.schoolId,
						sessionTermId: termId!,
					},
					OR: [
						{ billPayment: { deletedAt: null } },
						{
							studentPayment: {
								deletedAt: null,
								studentTermForm: { student: { deletedAt: null } },
							},
						},
					],
				},
				select: {
					id: true,
					amount: true,
					summary: true,
					type: true,
					createdAt: true,
					wallet: {
						select: {
							sessionTerm: {
								select: {
									title: true,
									session: { select: { title: true } },
								},
							},
						},
					},
					studentPayment: {
						select: {
							studentTermForm: {
								select: {
									sessionTerm: {
										select: {
											title: true,
											session: { select: { title: true } },
										},
									},
									student: {
										select: { name: true, otherName: true, surname: true },
									},
								},
							},
						},
					},
				},
				orderBy: { createdAt: "desc" },
			});
			return txs.map((tx) => ({
				id: tx.id,
				amount: tx.amount,
				type: tx.type,
				createdAt: tx.createdAt,
				student: tx.studentPayment?.studentTermForm?.student,
				billTerm: tx.studentPayment?.studentTermForm?.sessionTerm,
				invoiceTerm: tx.wallet?.sessionTerm,
			}));
		}),

	// ── Student Purchase (stationary, uniform, etc.) ────────────────────────────

	getStudentPurchaseSuggestions: financeReadProcedure
		.input(
			z
				.object({
					query: z.string().optional().nullable(),
				})
				.optional(),
		)
		.query(async ({ input, ctx }) => {
			const query = input?.query?.trim();
			const purchases = await ctx.db.studentPurchase.findMany({
				where: {
					deletedAt: null,
					payments: {
						some: {
							schoolProfileId: ctx.profile.schoolId,
							deletedAt: null,
							type: "PURCHASE",
						},
					},
					...(query
						? {
								OR: [
									{ title: { contains: query, mode: "insensitive" } },
									{ description: { contains: query, mode: "insensitive" } },
								],
							}
						: {}),
				},
				distinct: ["title", "description", "amount"],
				orderBy: { createdAt: "desc" },
				take: 20,
				select: {
					id: true,
					title: true,
					description: true,
					amount: true,
				},
			});

			return purchases.map((purchase) => ({
				id: purchase.id,
				title: purchase.title,
				description: purchase.description,
				amount: purchase.amount,
			}));
		}),

	createStudentPurchase: financeWriteProcedure
		.input(
			z.object({
				studentId: z.string(),
				studentTermFormId: z.string(),
				title: z.string().min(1),
				description: z.string().optional().nullable(),
				amount: z.number().positive(),
				paid: z.boolean().default(false),
				paymentMethod: z.string().optional().nullable(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			return ctx.db.$transaction(
				async (tx) => {
					const wallet = await getOrCreateWallet(tx, {
						name: input.title.trim(),
						type: "fee",
						schoolId: ctx.profile.schoolId!,
						termId: ctx.profile.termId!,
					});

					if (!input.paid) {
						const draftWalletTx = await tx.walletTransactions.create({
							data: {
								amount: 0,
								walletId: wallet.id,
								type: "credit",
								status: "draft",
								transactionDate: new Date(),
							},
						});
						const purchase = await tx.studentPurchase.create({
							data: {
								title: input.title,
								description: input.description ?? "",
								amount: input.amount,
								paid: 0,
							},
						});
						await tx.studentPayment.create({
							data: {
								type: "PURCHASE",
								paymentType: input.title,
								amount: input.amount,
								status: "draft",
								description: input.paymentMethod || input.description,
								schoolProfileId: ctx.profile.schoolId!,
								studentTermFormId: input.studentTermFormId,
								walletTransactionsId: draftWalletTx.id,
								studentPurchaseId: purchase.id,
							},
						});
						return { success: true };
					}

					const walletTx = await tx.walletTransactions.create({
						data: {
							amount: input.amount,
							walletId: wallet.id,
							type: "credit",
							status: "success",
							transactionDate: new Date(),
						},
					});

					const purchase = await tx.studentPurchase.create({
						data: {
							title: input.title,
							description: input.description ?? "",
							amount: input.amount,
							paid: input.amount,
						},
					});

					await tx.studentPayment.create({
						data: {
							type: "PURCHASE",
							paymentType: input.title,
							amount: input.amount,
							status: "success",
							description: input.paymentMethod || input.description,
							schoolProfileId: ctx.profile.schoolId!,
							studentTermFormId: input.studentTermFormId,
							walletTransactionsId: walletTx.id,
							studentPurchaseId: purchase.id,
						},
					});

					return { success: true };
				},
				{
					maxWait: 10000,
					timeout: 20000,
				},
			);
		}),

	// ── Collection Management ───────────────────────────────────────────────────

	getCollectionSummary: financeReadProcedure
		.input(
			z.object({
				termId: z.string().optional().nullable(),
				feeHistoryId: z.string().optional().nullable(),
			}),
		)
		.query(async ({ input, ctx }) => {
			const termId = input.termId || ctx.profile.termId;

			// Get all classrooms active in this term
			const departments = await ctx.db.classRoomDepartment.findMany({
				where: {
					schoolProfileId: ctx.profile.schoolId,
					deletedAt: null,
					studentTermForms: {
						some: { sessionTermId: termId!, deletedAt: null },
					},
				},
				select: {
					id: true,
					departmentName: true,
					classRoom: { select: { name: true } },
					studentTermForms: {
						where: { sessionTermId: termId!, deletedAt: null },
						select: {
							id: true,
							studentFees: {
								where: {
									deletedAt: null,
									status: { not: "cancelled" },
									schoolSessionId: ctx.profile.sessionId!,
									...(input.feeHistoryId
										? { feeHistoryId: input.feeHistoryId }
										: {}),
								},
								select: {
									id: true,
									billAmount: true,
									pendingAmount: true,
									collectionStatus: true,
									feeHistory: {
										select: {
											dueDate: true,
										},
									},
								},
							},
						},
					},
				},
				orderBy: { departmentName: "asc" },
			});

			return departments.map((dept) => {
				const allFees = dept.studentTermForms.flatMap((tf) => tf.studentFees);
				const studentCount = dept.studentTermForms.length;
				const totalBilled = allFees.reduce((s, f) => s + f.billAmount, 0);
				const totalPaid = allFees.reduce(
					(s, f) => s + Math.max(f.billAmount - f.pendingAmount, 0),
					0,
				);
				const totalPending = allFees.reduce((s, f) => s + f.pendingAmount, 0);
				const paidCount = allFees.filter((f) => f.pendingAmount <= 0).length;
				const partialCount = allFees.filter(
					(f) => f.pendingAmount > 0 && f.pendingAmount < f.billAmount,
				).length;
				const unpaidCount = allFees.filter(
					(f) => f.pendingAmount >= f.billAmount && f.billAmount > 0,
				).length;
				const waivedCount = allFees.filter(
					(f) => f.collectionStatus === "WAIVED",
				).length;
				const overdueCount = allFees.filter(
					(f: any) =>
						f.pendingAmount > 0 &&
						f.collectionStatus !== "WAIVED" &&
						f.feeHistory?.dueDate &&
						new Date(f.feeHistory.dueDate) < new Date(),
				).length;

				return {
					classroomId: dept.id,
					classroomName: getDepartmentName(dept),
					studentCount,
					totalBilled,
					totalPaid,
					totalPending,
					collectionRate:
						totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0,
					paidCount,
					partialCount,
					unpaidCount,
					waivedCount,
					overdueCount,
				};
			});
		}),

	getCollectionStudents: financeReadProcedure
		.input(
			z.object({
				classroomId: z.string(),
				termId: z.string().optional().nullable(),
				feeHistoryId: z.string().optional().nullable(),
				collectionStatus: z
					.enum(["ALL", "PENDING", "PARTIAL", "PAID", "WAIVED", "OVERDUE"])
					.default("ALL"),
			}),
		)
		.query(async ({ input, ctx }) => {
			const termId = input.termId || ctx.profile.termId;

			const termForms = await ctx.db.studentTermForm.findMany({
				where: {
					sessionTermId: termId!,
					classroomDepartmentId: input.classroomId,
					schoolProfileId: ctx.profile.schoolId,
					deletedAt: null,
				},
				select: {
					id: true,
					student: {
						select: {
							id: true,
							name: true,
							surname: true,
							otherName: true,
						},
					},
					studentFees: {
						where: {
							deletedAt: null,
							status: { not: "cancelled" },
							...(input.feeHistoryId
								? { feeHistoryId: input.feeHistoryId }
								: {}),
						},
						select: {
							id: true,
							feeTitle: true,
							billAmount: true,
							pendingAmount: true,
							collectionStatus: true,
							feeHistory: {
								select: { fee: { select: { title: true } }, dueDate: true },
							},
						},
					},
				},
				orderBy: { student: { surname: "asc" } },
			});

			const result = termForms
				.map((tf) => {
					const matchingFees =
						input.collectionStatus === "ALL"
							? tf.studentFees
							: tf.studentFees.filter((fee) =>
									matchesCollectionStatus(
										fee,
										input.collectionStatus,
									),
								);

					const totalBilled = matchingFees.reduce((s, f) => s + f.billAmount, 0);
					const totalPaid = matchingFees.reduce(
						(s, f) => s + Math.max(f.billAmount - f.pendingAmount, 0),
						0,
					);
					const totalPending = matchingFees.reduce(
						(s, f) => s + f.pendingAmount,
						0,
					);
					let computedStatus = "NO_FEES";
					if (matchingFees.length > 0) {
						if (
							matchingFees.every((fee) => fee.collectionStatus === "WAIVED")
						) {
							computedStatus = "WAIVED";
							} else if (
								matchingFees.every(
									(fee) =>
										fee.pendingAmount <= 0 && fee.collectionStatus !== "WAIVED",
								)
							) {
								computedStatus = "PAID";
							} else if (
							matchingFees.some((fee) =>
								matchesCollectionStatus(fee, "OVERDUE"),
							)
						) {
							computedStatus = "OVERDUE";
							} else if (
								matchingFees.some(
									(fee) =>
										fee.pendingAmount > 0 && fee.pendingAmount < fee.billAmount,
								)
							) {
							computedStatus = "PARTIAL";
						} else {
							computedStatus = "PENDING";
						}
					}

					return {
						studentId: tf.student?.id,
						studentTermFormId: tf.id,
						studentName: getStudentName(tf.student as any),
						totalBilled,
						totalPaid,
						totalPending,
						collectionStatus: computedStatus,
						fees: matchingFees.map((f) => ({
							id: f.id,
							title: f.feeTitle || f.feeHistory?.fee?.title || "Fee",
							billAmount: f.billAmount,
							pendingAmount: f.pendingAmount,
							paidAmount: Math.max(f.billAmount - f.pendingAmount, 0),
							collectionStatus: f.collectionStatus,
							dueDate: f.feeHistory?.dueDate ?? null,
						})),
					};
				})
				.filter((row) => row.fees.length > 0 || input.collectionStatus === "ALL");

			return result;
		}),

	waiveFee: financeWriteProcedure
		.input(
			z.object({
				studentFeeId: z.string(),
				reason: z.string().optional().nullable(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const fee = await ctx.db.studentFee.findFirstOrThrow({
				where: {
					id: input.studentFeeId,
					schoolProfileId: ctx.profile.schoolId,
					deletedAt: null,
					status: { not: "cancelled" },
				},
				select: { id: true, pendingAmount: true },
			});

			requireAdminApprovalForLargeAction(ctx, {
				amount: fee.pendingAmount || 0,
				action: "waive fees",
			});

			await ctx.db.$transaction(
				async (tx) => {
					await tx.studentFee.update({
						where: { id: fee.id },
						data: {
							collectionStatus: "WAIVED",
							pendingAmount: 0,
						} as any,
					});
					if (input.reason) {
						await tx.feeDiscount.create({
							data: {
								studentFeeId: fee.id,
								amount: fee.pendingAmount,
								reason: input.reason,
								approvedBy: ctx.currentUser!.id,
							} as any,
						});
					}
				},
				{ maxWait: 10000, timeout: 20000 },
				);

			await logFinanceActivity(ctx, {
				title: "Student fee waived",
				description: input.reason || "Waiver recorded from collections workspace",
				meta: {
					studentFeeId: fee.id,
					amount: fee.pendingAmount || 0,
				},
			});

				return { success: true };
			}),

	applyDiscount: financeWriteProcedure
		.input(
			z.object({
				studentFeeId: z.string(),
				amount: z.number().positive(),
				reason: z.string().optional().nullable(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			requireAdminApprovalForLargeAction(ctx, {
				amount: input.amount,
				action: "apply discounts",
			});
			const fee = await ctx.db.studentFee.findFirstOrThrow({
				where: {
					id: input.studentFeeId,
					schoolProfileId: ctx.profile.schoolId,
					deletedAt: null,
					status: { not: "cancelled" },
				},
				select: { id: true, pendingAmount: true, billAmount: true },
			});

			if (input.amount > fee.pendingAmount) {
				throw new Error(
					`Discount amount (${input.amount}) exceeds pending amount (${fee.pendingAmount})`,
				);
			}

			const newPending = fee.pendingAmount - input.amount;
			const newStatus =
				newPending <= 0
					? "PAID"
					: newPending < fee.billAmount
						? "PARTIAL"
						: "PENDING";

			await ctx.db.$transaction(
				async (tx) => {
					await tx.studentFee.update({
						where: { id: fee.id },
						data: {
							pendingAmount: newPending,
							collectionStatus: newStatus,
						} as any,
					});
					await tx.feeDiscount.create({
						data: {
							studentFeeId: fee.id,
							amount: input.amount,
							reason: input.reason,
							approvedBy: ctx.currentUser!.id,
						} as any,
					});
				},
				{ maxWait: 10000, timeout: 20000 },
				);

			await logFinanceActivity(ctx, {
				title: "Student fee discount applied",
				description: input.reason || "Discount recorded from collections workspace",
				meta: {
					studentFeeId: fee.id,
					amount: input.amount,
					newPendingAmount: newPending,
				},
			});

				return { success: true, newPendingAmount: newPending };
			}),
});
