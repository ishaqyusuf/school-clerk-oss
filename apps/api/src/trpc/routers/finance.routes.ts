import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
	closeFinanceTermLedger,
	cancelFinancePurchase,
	createFinancePayrollObligation,
	createFinanceCharge,
	getFinancePayeeHistory,
	getFinanceProjectAccountSummary,
	getFinanceOverview,
	getFinanceStaffHistory,
	getFinanceTermLedger,
	getReceivePaymentOptions,
	getFinanceTermAccountStatement,
	getFinanceStreamDetails,
	getStudentFinanceStatement,
	listFinanceCharges,
	listFinanceItems,
	listFinanceLedgerEntries,
	listFinancePayments,
	listFinancePayees,
	listFinanceStaff,
	listFinanceStreams,
	listFinanceTransactions,
	listFinanceTransfers,
	previewFinanceTermClose,
	recordFinancePurchase,
	recordFinancePayment,
	requireFinanceReadAccess,
	receiveStudentPaymentSimple,
	reopenFinanceTermLedger,
	reverseFinancePayment,
	searchFinanceStudents,
	transferFinanceFunds,
	upsertFinancePayee,
	upsertFinancePayrollStructure,
	upsertFinanceItem,
	upsertFinanceStream,
} from "../../db/queries/finance";
import {
	type TRPCContext,
	authenticatedProcedure,
	createTRPCRouter,
} from "../init";
import {
	financeChargeInputSchema,
	financeItemInputSchema,
	financePayeeHistorySchema,
	financePayeeInputSchema,
	financePayeeQuerySchema,
	financePaymentInputSchema,
	financePayrollObligationInputSchema,
	financePayrollStructureInputSchema,
	financeProjectAccountSummarySchema,
	financePurchaseInputSchema,
	financePurchaseCancellationSchema,
	financeReceivePaymentOptionsSchema,
	financeSimpleStudentPaymentInputSchema,
	financeStaffHistorySchema,
	financeSearchInputSchema,
	financeStreamDetailsSchema,
	financeStreamInputSchema,
	financeStreamQuerySchema,
	financeStudentQueryCompatSchema,
	financeStudentQuerySchema,
	financeTermAccountStatementSchema,
	financeTermCloseSchema,
	financeTermLedgerQuerySchema,
	financeTransferInputSchema,
} from "../schemas/finance";

const resetPayload = {
	success: false,
	message:
		"This legacy finance action has been replaced by the standardized finance system.",
};

const resetPaymentPayload = {
	...resetPayload,
	paymentId: "",
	paymentIds: [],
	allocationId: "",
	count: 0,
	totalAllocated: 0,
	chargeStatus: "CANCELLED",
};

const chargeListInput = z
	.object({
		streamId: z.string().optional().nullable(),
		studentId: z.string().optional().nullable(),
		staffProfileId: z.string().optional().nullable(),
		classroomId: z.string().optional().nullable(),
		classroomDepartmentId: z.string().optional().nullable(),
		termId: z.string().optional().nullable(),
		sessionId: z.string().optional().nullable(),
		status: z.string().optional().nullable(),
		collectionStatus: z.string().optional().nullable(),
		payerType: z.string().optional().nullable(),
		excludePayerType: z.string().optional().nullable(),
		type: z.string().optional().nullable(),
		excludeType: z.string().optional().nullable(),
	})
	.optional();

const itemListInput = z
	.object({
		type: z.string().optional().nullable(),
		excludeType: z.string().optional().nullable(),
	})
	.optional();

const optionalCompatInput = z.object({}).passthrough().optional();

const streamCompatInput = financeStreamInputSchema
	.extend({
		type: z.string().optional().nullable(),
	})
	.passthrough();

const transferCompatInput = financeTransferInputSchema
	.partial({
		fromStreamId: true,
		toStreamId: true,
	})
	.extend({
		fromWalletId: z.string().optional().nullable(),
		toWalletId: z.string().optional().nullable(),
	})
	.passthrough();

const legacyItemInput = z
	.object({
		id: z.string().optional().nullable(),
		billableId: z.string().optional().nullable(),
		streamId: z.string().optional().nullable(),
		streamName: z.string().optional().nullable(),
		accountType: z.enum(["CREDIT", "DEBIT"]).optional(),
		type: z.string().optional().nullable(),
		name: z.string().optional().nullable(),
		title: z.string().optional().nullable(),
		description: z.string().optional().nullable(),
		amount: z.coerce.number().nonnegative(),
		collectable: z.boolean().optional(),
		isActive: z.boolean().optional(),
		sessionId: z.string().optional().nullable(),
		termId: z.string().optional().nullable(),
		classRoomDepartmentIds: z.array(z.string()).optional(),
		classroomDepartments: z.array(z.string()).optional(),
	})
	.passthrough();

const legacyChargeInput = z
	.object({
		id: z.string().optional().nullable(),
		itemId: z.string().optional().nullable(),
		billableId: z.string().optional().nullable(),
		streamId: z.string().optional().nullable(),
		streamName: z.string().optional().nullable(),
		type: z.string().optional().nullable(),
		payerType: z.enum(["STUDENT", "STAFF", "SCHOOL"]).optional(),
		studentId: z.string().optional().nullable(),
		studentTermFormId: z.string().optional().nullable(),
		staffProfileId: z.string().optional().nullable(),
		staffTermProfileId: z.string().optional().nullable(),
		payeeId: z.string().optional().nullable(),
		payrollStructureId: z.string().optional().nullable(),
		classroomDepartmentId: z.string().optional().nullable(),
		sessionId: z.string().optional().nullable(),
		termId: z.string().optional().nullable(),
		title: z.string().min(1),
		description: z.string().optional().nullable(),
		amount: z.coerce.number().nonnegative(),
		collectionStatus: z
			.enum(["NOT_REQUIRED", "NOT_COLLECTED", "COLLECTED"])
			.optional(),
		dueDate: z.coerce.date().optional().nullable(),
	})
	.passthrough();

const legacyPaymentAllocationInput = z.object({
	source: z.string().optional().nullable(),
	studentTermFormId: z.string().optional().nullable(),
	studentFeeId: z.string().optional().nullable(),
	billableHistoryId: z.string().optional().nullable(),
	feeHistoryId: z.string().optional().nullable(),
	streamId: z.string().optional().nullable(),
	streamName: z.string().optional().nullable(),
	title: z.string().optional().nullable(),
	description: z.string().optional().nullable(),
	amountDue: z.coerce.number().optional().nullable(),
	amountToPay: z.coerce.number().optional().nullable(),
});

const legacyPaymentInput = financePaymentInputSchema
	.partial({ chargeId: true, amount: true })
	.extend({
		billId: z.string().optional().nullable(),
		studentId: z.string().optional().nullable(),
		studentTermFormId: z.string().optional().nullable(),
		paymentMethod: z.string().optional().nullable(),
		amountReceived: z.coerce.number().optional().nullable(),
		allocations: z.array(legacyPaymentAllocationInput).optional(),
	})
	.passthrough();

type NormalizedFinanceItemType =
	| "TUITION_FEE"
	| "BOOK"
	| "SERVICE"
	| "SALARY"
	| "OTHER";

function normalizeItemType(value?: string | null): NormalizedFinanceItemType {
	switch (value) {
		case "TUITION_FEE":
		case "BOOK":
		case "SERVICE":
		case "SALARY":
			return value;
		default:
			return "OTHER";
	}
}

function requireTransferStreamId(
	value: string | null | undefined,
	label: string,
) {
	if (!value) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `${label} stream is required.`,
		});
	}

	return value;
}

function requirePaymentChargeId(value: string | null | undefined) {
	if (!value) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Finance charge is required for payment.",
		});
	}

	return value;
}

function normalizeStudentQuery(
	input: z.infer<typeof financeStudentQueryCompatSchema>,
	ctx: TRPCContext,
) {
	const parsed = financeStudentQuerySchema.parse(input);
	const studentId = parsed.studentId;

	if (!studentId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Student is required.",
		});
	}

	const termId = parsed.termId ?? ctx.profile.termId ?? null;

	return {
		studentId,
		termId,
		sessionId:
			parsed.sessionId ?? (parsed.termId ? null : ctx.profile.sessionId ?? null),
	};
}

function normalizePaymentInput(
	input: z.infer<typeof legacyPaymentInput>,
	chargeId: string,
) {
	const amount =
		input.amount ??
		input.amountReceived ??
		input.allocations?.reduce(
			(sum, allocation) => sum + (allocation.amountToPay ?? 0),
			0,
		) ??
		0;

	if (amount <= 0) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Payment amount must be greater than zero.",
		});
	}

	return {
		chargeId,
		amount,
		paymentDate: input.paymentDate,
		method: input.method ?? input.paymentMethod,
		reference: input.reference,
		note: input.note,
		receivedById: input.receivedById,
	};
}

async function recordLegacyStudentPayment(
	ctx: TRPCContext,
	input: z.infer<typeof legacyPaymentInput>,
) {
	const allocations =
		input.allocations?.filter(
			(allocation) => (allocation.amountToPay ?? 0) > 0,
		) ?? [];

	if (!allocations.length) {
		return resetPaymentPayload;
	}

	const totalAllocated = allocations.reduce(
		(sum, allocation) => sum + (allocation.amountToPay ?? 0),
		0,
	);

	if (
		input.amountReceived != null &&
		Math.abs(totalAllocated - input.amountReceived) > 0.01
	) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Allocated fee amounts must match the amount received.",
		});
	}

	const paymentResults: Awaited<ReturnType<typeof recordFinancePayment>>[] = [];

	for (const allocation of allocations) {
		let chargeId = allocation.studentFeeId ?? allocation.billableHistoryId;

		if (!chargeId) {
			if (!input.studentId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Student is required for manual payment rows.",
				});
			}

			const charge = await createFinanceCharge(ctx, {
				id: null,
				itemId: null,
				streamId: allocation.streamId,
				type: "OTHER",
				payerType: "STUDENT",
				studentId: input.studentId,
				studentTermFormId:
					allocation.studentTermFormId ?? input.studentTermFormId,
				staffProfileId: null,
				staffTermProfileId: null,
				classroomDepartmentId: null,
				sessionId: ctx.profile.sessionId,
				termId: ctx.profile.termId,
				title:
					allocation.title ??
					allocation.description ??
					allocation.streamName ??
					"Manual charge",
				description: allocation.description,
				amount: allocation.amountDue ?? allocation.amountToPay ?? 0,
				collectionStatus: "NOT_REQUIRED",
				dueDate: null,
			});

			chargeId = charge.id;
		}

		paymentResults.push(
			await recordFinancePayment(ctx, {
				chargeId: requirePaymentChargeId(chargeId),
				amount: allocation.amountToPay ?? 0,
				paymentDate: input.paymentDate,
				method: input.method ?? input.paymentMethod,
				reference: input.reference,
				note: input.note ?? allocation.description,
				receivedById: input.receivedById,
			}),
		);
	}

	return {
		success: true,
		paymentId: paymentResults[0]?.paymentId ?? "",
		paymentIds: paymentResults.map((result) => result.paymentId),
		allocationId: paymentResults[0]?.allocationId ?? "",
		count: paymentResults.length,
		totalAllocated,
		chargeStatus: paymentResults.at(-1)?.chargeStatus ?? "PAID",
	};
}

function normalizeLegacyChargeInput(
	input: z.infer<typeof legacyChargeInput>,
	defaultPayerType: "STUDENT" | "STAFF" | "SCHOOL",
) {
	const payerType =
		input.payerType ??
		(input.studentId || input.studentTermFormId
			? "STUDENT"
			: input.staffProfileId || input.staffTermProfileId
				? "STAFF"
				: defaultPayerType);

	return {
		id: input.id,
		itemId: input.itemId ?? input.billableId,
		streamId: input.streamId,
		streamName: input.streamName,
		type: normalizeItemType(input.type),
		payerType,
		studentId: input.studentId,
		studentTermFormId: input.studentTermFormId,
		staffProfileId: input.staffProfileId,
		staffTermProfileId: input.staffTermProfileId,
		payeeId: input.payeeId,
		payrollStructureId: input.payrollStructureId,
		classroomDepartmentId: input.classroomDepartmentId,
		sessionId: input.sessionId,
		termId: input.termId,
		title: input.title,
		description: input.description,
		amount: input.amount,
		collectionStatus: input.collectionStatus,
		dueDate: input.dueDate,
	};
}

export const financeRouter = createTRPCRouter({
	overview: authenticatedProcedure.query(({ ctx }) => getFinanceOverview(ctx)),

	getTermLedger: authenticatedProcedure
		.input(financeTermLedgerQuerySchema)
		.query(({ ctx, input }) => getFinanceTermLedger(ctx, input)),

	getTermAccountStatement: authenticatedProcedure
		.input(financeTermAccountStatementSchema)
		.query(({ ctx, input }) => getFinanceTermAccountStatement(ctx, input)),

	getProjectAccountSummary: authenticatedProcedure
		.input(financeProjectAccountSummarySchema)
		.query(({ ctx, input }) => getFinanceProjectAccountSummary(ctx, input)),

	getStaffFinanceHistory: authenticatedProcedure
		.input(financeStaffHistorySchema)
		.query(({ ctx, input }) => getFinanceStaffHistory(ctx, input)),

	getPayeeHistory: authenticatedProcedure
		.input(financePayeeHistorySchema)
		.query(({ ctx, input }) => getFinancePayeeHistory(ctx, input)),

	previewTermClose: authenticatedProcedure
		.input(financeTermCloseSchema)
		.query(({ ctx, input }) => previewFinanceTermClose(ctx, input)),

	closeTermLedger: authenticatedProcedure
		.input(financeTermCloseSchema)
		.mutation(({ ctx, input }) => closeFinanceTermLedger(ctx, input)),

	reopenTermLedger: authenticatedProcedure
		.input(financeTermCloseSchema)
		.mutation(({ ctx, input }) => reopenFinanceTermLedger(ctx, input)),

	getStreams: authenticatedProcedure
		.input(financeStreamQuerySchema)
		.query(({ ctx, input }) => listFinanceStreams(ctx, input)),

	getStreamDetails: authenticatedProcedure
		.input(financeStreamDetailsSchema)
		.query(async ({ ctx, input }) => getFinanceStreamDetails(ctx, input)),

	createStream: authenticatedProcedure
		.input(streamCompatInput)
		.mutation(({ ctx, input }) =>
			upsertFinanceStream(ctx, {
				id: input.id,
				name: input.name,
				slug: input.slug,
				accountType:
					input.accountType === "DEBIT" ||
					input.type === "DEBIT" ||
					input.type === "out"
						? "DEBIT"
						: "CREDIT",
				description: input.description,
				isSystem: input.isSystem,
			}),
		),

	createItem: authenticatedProcedure
		.input(financeItemInputSchema)
		.mutation(({ ctx, input }) => upsertFinanceItem(ctx, input)),

	getPayees: authenticatedProcedure
		.input(financePayeeQuerySchema)
		.query(({ ctx, input }) => listFinancePayees(ctx, input)),
	upsertPayee: authenticatedProcedure
		.input(financePayeeInputSchema)
		.mutation(({ ctx, input }) => upsertFinancePayee(ctx, input)),
	upsertPayrollStructure: authenticatedProcedure
		.input(financePayrollStructureInputSchema)
		.mutation(({ ctx, input }) => upsertFinancePayrollStructure(ctx, input)),
	createPayrollObligation: authenticatedProcedure
		.input(financePayrollObligationInputSchema)
		.mutation(({ ctx, input }) => createFinancePayrollObligation(ctx, input)),
	recordPurchase: authenticatedProcedure
		.input(financePurchaseInputSchema)
		.mutation(({ ctx, input }) => recordFinancePurchase(ctx, input)),
	cancelPurchase: authenticatedProcedure
		.input(financePurchaseCancellationSchema)
		.mutation(({ ctx, input }) => cancelFinancePurchase(ctx, input)),

	getItems: authenticatedProcedure
		.input(itemListInput)
		.query(({ ctx, input }) => listFinanceItems(ctx, input)),

	createCharge: authenticatedProcedure
		.input(financeChargeInputSchema)
		.mutation(({ ctx, input }) => createFinanceCharge(ctx, input)),

	getCharges: authenticatedProcedure
		.input(chargeListInput)
		.query(({ ctx, input }) => listFinanceCharges(ctx, input)),

	recordPayment: authenticatedProcedure
		.input(financePaymentInputSchema)
		.mutation(({ ctx, input }) => recordFinancePayment(ctx, input)),

	getPayments: authenticatedProcedure
		.input(z.object({ payerType: z.string().optional().nullable() }).optional())
		.query(({ ctx, input }) => listFinancePayments(ctx, input)),

	transferFunds: authenticatedProcedure
		.input(transferCompatInput)
		.mutation(({ ctx, input }) =>
			transferFinanceFunds(ctx, {
				fromStreamId: requireTransferStreamId(
					input.fromStreamId ?? input.fromWalletId,
					"Source",
				),
				toStreamId: requireTransferStreamId(
					input.toStreamId ?? input.toWalletId,
					"Destination",
				),
				amount: input.amount,
				note: input.note,
				sentById: input.sentById,
			}),
		),

	getInternalTransfers: authenticatedProcedure
		.input(optionalCompatInput)
		.query(({ ctx }) => listFinanceTransfers(ctx)),

	getLedgerEntries: authenticatedProcedure.query(({ ctx }) =>
		listFinanceLedgerEntries(ctx),
	),

	getStudentStatement: authenticatedProcedure
		.input(financeStudentQueryCompatSchema)
		.query(async ({ ctx, input }) =>
			getStudentFinanceStatement(ctx, normalizeStudentQuery(input, ctx)),
		),

	getFinanceIntegrityReport: authenticatedProcedure
		.input(optionalCompatInput)
		.query(async ({ ctx }) => {
			requireFinanceReadAccess(ctx);
			const overview = await getFinanceOverview(ctx);
			const schoolProfileId = ctx.profile.schoolId;
			const termId = ctx.profile.termId ?? null;
			const sessionId = ctx.profile.sessionId ?? null;
			const [
				pendingPayables,
				missingLedgerTerms,
				unresolvedTransfers,
				cancelledLedgerEffects,
				unmatchedCarryForwards,
			] = await Promise.all([
				ctx.db.financeCharge.findMany({
					where: {
						schoolProfileId,
						deletedAt: null,
						payerType: { in: ["STAFF", "SCHOOL"] },
						status: { in: ["PENDING", "PARTIALLY_PAID"] },
						...(termId ? { sessionTermId: termId } : {}),
						...(sessionId ? { schoolSessionId: sessionId } : {}),
					},
					select: {
						id: true,
						title: true,
						amount: true,
						amountPaid: true,
						stream: { select: { id: true, name: true } },
					},
					take: 50,
				}),
				ctx.db.financeLedgerEntry.findMany({
					where: {
						schoolProfileId,
						deletedAt: null,
						collectedSessionTermId: null,
						charge: { sessionTermId: null },
					},
					select: { id: true, sourceType: true, amount: true, occurredAt: true },
					take: 50,
				}),
				ctx.db.financeTransfer.findMany({
					where: {
						schoolProfileId,
						deletedAt: null,
						status: { not: "COMPLETED" },
					},
					select: { id: true, amount: true, status: true, note: true },
					take: 50,
				}),
				ctx.db.financeLedgerEntry.findMany({
					where: {
						schoolProfileId,
						deletedAt: null,
						OR: [
							{ charge: { status: "CANCELLED" } },
							{ payment: { status: { in: ["CANCELLED", "REFUNDED"] } } },
						],
					},
					select: {
						id: true,
						sourceType: true,
						sourceId: true,
						amount: true,
						chargeId: true,
						paymentId: true,
					},
					take: 50,
				}),
				ctx.db.financeTermCarryForward.findMany({
					where: {
						schoolProfileId,
						deletedAt: null,
						ledgerEntryId: null,
					},
					select: { id: true, streamId: true, amount: true, direction: true },
					take: 50,
				}),
			]);
			const negativeAccounts = overview.streams.filter(
				(stream) => stream.balance < 0,
			);
			const checks = [
				{
					key: "ledger-balance",
					label: "Ledger balance",
					status: "ok",
					message:
						"Account balances are computed from finance ledger entries.",
				},
				{
					key: "missing-ledger-terms",
					label: "Missing ledger terms",
					status: missingLedgerTerms.length ? "warning" : "ok",
					message: missingLedgerTerms.length
						? `${missingLedgerTerms.length} ledger entries need term attribution review.`
						: "All sampled ledger entries have collected-in or paid-for term attribution.",
				},
				{
					key: "negative-accounts",
					label: "Negative accounts",
					status: negativeAccounts.length ? "warning" : "ok",
					message: negativeAccounts.length
						? `${negativeAccounts.length} account${negativeAccounts.length === 1 ? "" : "s"} need funding before close.`
						: "No account is currently negative.",
				},
				{
					key: "pending-payables",
					label: "Pending payables",
					status: pendingPayables.length ? "warning" : "ok",
					message: pendingPayables.length
						? `${pendingPayables.length} staff or school payable${pendingPayables.length === 1 ? "" : "s"} remain unpaid.`
						: "No pending staff or school payables found for the current context.",
				},
				{
					key: "unresolved-transfers",
					label: "Unresolved transfers",
					status: unresolvedTransfers.length ? "warning" : "ok",
					message: unresolvedTransfers.length
						? `${unresolvedTransfers.length} transfer${unresolvedTransfers.length === 1 ? "" : "s"} are not completed.`
						: "No unresolved transfers found.",
				},
				{
					key: "cancelled-ledger-effects",
					label: "Cancelled ledger effects",
					status: cancelledLedgerEffects.length ? "warning" : "ok",
					message: cancelledLedgerEffects.length
						? `${cancelledLedgerEffects.length} ledger entr${cancelledLedgerEffects.length === 1 ? "y" : "ies"} still point at cancelled or refunded records.`
						: "Cancelled or refunded records do not have active sampled ledger effects.",
				},
				{
					key: "carry-forward",
					label: "Carry-forward matching",
					status: unmatchedCarryForwards.length ? "warning" : "ok",
					message: unmatchedCarryForwards.length
						? `${unmatchedCarryForwards.length} carry-forward entr${unmatchedCarryForwards.length === 1 ? "y" : "ies"} are not linked to opening ledger entries.`
						: "Carry-forward rows are linked to opening ledger entries.",
				},
			];
			return {
				totals: {
					...overview.summary,
					streamAvailableFunds: overview.summary.totalBalance,
					streamPendingBills: pendingPayables.reduce(
						(sum, charge) =>
							sum + (Number(charge.amount) - Number(charge.amountPaid)),
						0,
					),
					streamOwing: negativeAccounts.reduce(
						(sum, stream) => sum + Math.abs(stream.balance),
						0,
					),
					studentPendingFees: 0,
				},
				checks,
				mismatches: {
					legacyPaymentsWithoutSettlement: [],
					missingStreams: missingLedgerTerms,
					streamProjectedDeficits: negativeAccounts,
					pendingPayables,
					unresolvedTransfers,
					cancelledLedgerEffects,
					unmatchedCarryForwards,
				},
			};
		}),

	getFinanceReports: authenticatedProcedure
		.input(optionalCompatInput)
		.query(async ({ ctx }) => {
			requireFinanceReadAccess(ctx);
			const overview = await getFinanceOverview(ctx);
			const schoolProfileId = ctx.profile.schoolId;
			const termId = ctx.profile.termId ?? null;
			const sessionId = ctx.profile.sessionId ?? null;
			const [purchases, arrears, payments, transfers, closes, carryForwards, payees] =
				await Promise.all([
					ctx.db.financePurchase.findMany({
						where: {
							schoolProfileId,
							deletedAt: null,
							...(termId ? { sessionTermId: termId } : {}),
							...(sessionId ? { schoolSessionId: sessionId } : {}),
						},
						include: {
							stream: { select: { id: true, name: true, accountType: true } },
							payee: { select: { id: true, name: true, type: true } },
							charge: { select: { id: true, title: true, status: true } },
							payment: {
								select: {
									id: true,
									reference: true,
									method: true,
									status: true,
									receivedById: true,
								},
							},
						},
						orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
						take: 500,
					}),
					ctx.db.financeCharge.findMany({
						where: {
							schoolProfileId,
							deletedAt: null,
							studentId: { not: null },
							status: { in: ["PENDING", "PARTIALLY_PAID"] },
						},
						include: {
							stream: { select: { id: true, name: true, accountType: true } },
							student: {
								select: { id: true, name: true, surname: true, otherName: true },
							},
						},
						orderBy: [{ createdAt: "desc" }],
						take: 500,
					}),
					ctx.db.financePayment.findMany({
						where: {
							schoolProfileId,
							deletedAt: null,
							...(termId ? { collectedSessionTermId: termId } : {}),
							...(sessionId ? { collectedSchoolSessionId: sessionId } : {}),
						},
						include: {
							stream: { select: { id: true, name: true, accountType: true } },
							staffProfile: { select: { id: true, name: true, title: true } },
							payee: { select: { id: true, name: true, type: true } },
						},
						orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
						take: 500,
					}),
					ctx.db.financeTransfer.findMany({
						where: {
							schoolProfileId,
							deletedAt: null,
						},
						include: {
							fromStream: { select: { id: true, name: true } },
							toStream: { select: { id: true, name: true } },
						},
						orderBy: [{ createdAt: "desc" }],
						take: 200,
					}),
					ctx.db.financeTermLedgerClose.findMany({
						where: { schoolProfileId, deletedAt: null },
						orderBy: [{ createdAt: "desc" }],
						take: 100,
					}),
					ctx.db.financeTermCarryForward.findMany({
						where: { schoolProfileId, deletedAt: null },
						include: { stream: { select: { id: true, name: true } } },
						orderBy: [{ createdAt: "desc" }],
						take: 200,
					}),
					ctx.db.financePayee.findMany({
						where: { schoolProfileId, deletedAt: null },
						orderBy: [{ name: "asc" }],
						take: 200,
					}),
				]);
			const payroll = await listFinanceCharges(ctx, { payerType: "STAFF" });
			const payables = await listFinanceCharges(ctx, {
				excludePayerType: "STUDENT",
				collectionStatus: "PENDING",
			});
			return {
				summary: overview.summary,
				streams: overview.streams,
				accounts: overview.streams,
				termLedgers: {
					currentTermId: termId,
					currentSessionId: sessionId,
					accounts: overview.streams,
				},
				payroll,
				payables,
				purchases: purchases.map((purchase) => ({
					...purchase,
					quantity: Number(purchase.quantity),
					unitCost: Number(purchase.unitCost),
					totalCost: Number(purchase.totalCost),
					amountPaid: Number(purchase.amountPaid),
				})),
				servicePayments: purchases.filter((purchase) =>
					["SERVICE", "LABOR", "DIRECT_EXPENSE", "REIMBURSEMENT"].includes(
						purchase.kind,
					),
				),
				collections: payments,
				arrears: arrears.map((charge) => ({
					id: charge.id,
					title: charge.title,
					studentName: [charge.student?.surname, charge.student?.name]
						.filter(Boolean)
						.join(" "),
					accountName: charge.stream.name,
					amount: Number(charge.amount),
					amountPaid: Number(charge.amountPaid),
					outstanding: Number(charge.amount) - Number(charge.amountPaid),
					status: charge.status,
				})),
				productProjectAccounts: overview.streams.map((stream) => ({
					id: stream.id,
					name: stream.name,
					moneyIn: stream.credit,
					moneyOut: stream.debit,
					balance: stream.balance,
					profitLoss: stream.credit - stream.debit,
				})),
				reconciliation: {
					transfers,
					closes,
					carryForwards,
				},
				auditTrail: {
					payments: payments.map((payment) => ({
						id: payment.id,
						action: "payment-recorded",
						accountName: payment.stream.name,
						amount: Number(payment.amount),
						actorId: payment.receivedById,
						status: payment.status,
						occurredAt: payment.paymentDate,
					})),
					transfers: transfers.map((transfer) => ({
						id: transfer.id,
						action: "transfer-recorded",
						fromAccountName: transfer.fromStream.name,
						toAccountName: transfer.toStream.name,
						amount: Number(transfer.amount),
						actorId: transfer.sentById,
						status: transfer.status,
						occurredAt: transfer.createdAt,
					})),
					termCloses: closes.map((close) => ({
						id: close.id,
						action:
							close.status === "REOPENED"
								? "term-ledger-reopened"
								: "term-ledger-closed",
						actorId: close.status === "REOPENED" ? close.reopenedById : close.closedById,
						status: close.status,
						occurredAt: close.status === "REOPENED" ? close.reopenedAt : close.closedAt,
					})),
					carryForwards: carryForwards.map((carryForward) => ({
						id: carryForward.id,
						action: "carry-forward-created",
						accountName: carryForward.stream.name,
						amount: Number(carryForward.amount),
						direction: carryForward.direction,
						occurredAt: carryForward.createdAt,
					})),
					purchases: purchases.map((purchase) => ({
						id: purchase.id,
						action: "purchase-recorded",
						accountName: purchase.stream.name,
						payeeName: purchase.payee?.name ?? null,
						amount: Number(purchase.totalCost),
						actorId: purchase.createdById,
						status: purchase.status,
						occurredAt: purchase.occurredAt,
					})),
					payees: payees.map((payee) => ({
						id: payee.id,
						action: "payee-available",
						name: payee.name,
						type: payee.type,
						actorId: payee.createdById,
						occurredAt: payee.createdAt,
					})),
				},
				owingLedger: payables,
			};
		}),

	getBillables: authenticatedProcedure
		.input(itemListInput)
		.query(({ ctx, input }) => listFinanceItems(ctx, input)),
	createBillable: authenticatedProcedure
		.input(legacyItemInput)
		.mutation(({ ctx, input }) =>
			upsertFinanceItem(ctx, {
				id: input.id ?? input.billableId,
				streamId: input.streamId,
				streamName: input.streamName,
				accountType: input.accountType,
				type: normalizeItemType(input.type ?? "SERVICE"),
				name: input.name ?? input.title ?? "Billable",
				description: input.description,
				amount: input.amount,
				collectable: input.collectable,
				isActive: input.isActive,
				sessionId: input.sessionId,
				termId: input.termId,
				classRoomDepartmentIds:
					input.classRoomDepartmentIds ?? input.classroomDepartments ?? [],
			}),
		),

	getBills: authenticatedProcedure
		.input(chargeListInput)
		.query(({ ctx, input }) => listFinanceCharges(ctx, input)),
	createBill: authenticatedProcedure
		.input(legacyChargeInput)
		.mutation(({ ctx, input }) =>
			createFinanceCharge(ctx, normalizeLegacyChargeInput(input, "SCHOOL")),
		),

	receiveStudentPayment: authenticatedProcedure
		.input(legacyPaymentInput)
		.mutation(({ ctx, input }) =>
			input.chargeId
				? recordFinancePayment(
						ctx,
						normalizePaymentInput(
							input,
							requirePaymentChargeId(input.chargeId),
						),
					)
				: recordLegacyStudentPayment(ctx, input),
		),
	receiveStudentPaymentSimple: authenticatedProcedure
		.input(financeSimpleStudentPaymentInputSchema)
		.mutation(({ ctx, input }) => receiveStudentPaymentSimple(ctx, input)),
	payStaffBill: authenticatedProcedure
		.input(legacyPaymentInput)
		.mutation(({ ctx, input }) =>
			(input.chargeId ?? input.billId)
				? recordFinancePayment(
						ctx,
						normalizePaymentInput(
							input,
							requirePaymentChargeId(input.chargeId ?? input.billId),
						),
					)
				: resetPaymentPayload,
		),
	payServiceBill: authenticatedProcedure
		.input(legacyPaymentInput)
		.mutation(({ ctx, input }) =>
			(input.chargeId ?? input.billId)
				? recordFinancePayment(
						ctx,
						normalizePaymentInput(
							input,
							requirePaymentChargeId(input.chargeId ?? input.billId),
						),
					)
				: resetPaymentPayload,
		),

	getReceivePaymentData: authenticatedProcedure
		.input(financeStudentQueryCompatSchema)
		.query(async ({ ctx, input }) =>
			getStudentFinanceStatement(ctx, normalizeStudentQuery(input, ctx)),
		),
	getReceivePaymentOptions: authenticatedProcedure
		.input(financeReceivePaymentOptionsSchema)
		.query(async ({ ctx, input }) =>
			getReceivePaymentOptions(ctx, normalizeStudentQuery(input, ctx)),
		),
	getStudentPayments: authenticatedProcedure
		.input(financeStudentQueryCompatSchema)
		.query(async ({ ctx, input }) => {
			const statement = await getStudentFinanceStatement(
				ctx,
				normalizeStudentQuery(input, ctx),
			);
			return statement.charges.flatMap((charge) => charge.payments);
		}),

	getServicePayments: authenticatedProcedure
		.input(chargeListInput)
		.query(async ({ ctx, input }) =>
			listFinanceCharges(ctx, { ...input, staffProfileId: null }),
		),
	getPayroll: authenticatedProcedure
		.input(chargeListInput)
		.query(({ ctx, input }) => listFinanceCharges(ctx, input)),
	createStaffBill: authenticatedProcedure
		.input(legacyChargeInput)
		.mutation(({ ctx, input }) =>
			createFinanceCharge(
				ctx,
				normalizeLegacyChargeInput(
					{ ...input, type: input.type ?? "SALARY" },
					"STAFF",
				),
			),
		),
	createServicePayment: authenticatedProcedure
		.input(legacyChargeInput)
		.mutation(({ ctx, input }) =>
			createFinanceCharge(ctx, normalizeLegacyChargeInput(input, "SCHOOL")),
		),

	getStaff: authenticatedProcedure.query(({ ctx }) => listFinanceStaff(ctx)),
	searchStudentsForPayment: authenticatedProcedure
		.input(financeSearchInputSchema)
		.query(({ ctx, input }) => searchFinanceStudents(ctx, input)),

	cancelInternalTransfer: authenticatedProcedure
		.input(optionalCompatInput)
		.mutation(() => resetPayload),
	addFund: authenticatedProcedure
		.input(optionalCompatInput)
		.mutation(() => resetPayload),
	withdrawFund: authenticatedProcedure
		.input(optionalCompatInput)
		.mutation(() => resetPayload),
	repayBillOwing: authenticatedProcedure
		.input(optionalCompatInput)
		.mutation(() => resetPayload),
	cancelServiceBillPayment: authenticatedProcedure
		.input(optionalCompatInput)
		.mutation(() => resetPayload),
	cancelStaffBillPayment: authenticatedProcedure
		.input(optionalCompatInput)
		.mutation(() => resetPayload),
	reverseStudentPayment: authenticatedProcedure
		.input(
			z.object({
				paymentId: z.string(),
				note: z.string().optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			if (!input.paymentId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Payment id is required.",
				});
			}

			return reverseFinancePayment(ctx, {
				note: input.note,
				paymentId: input.paymentId,
			});
		}),
	generateBillsFromBillables: authenticatedProcedure
		.input(optionalCompatInput)
		.mutation(() => resetPayload),
	backfillBillSettlements: authenticatedProcedure
		.input(optionalCompatInput)
		.mutation(() => resetPayload),
	getTransactions: authenticatedProcedure.query(async ({ ctx }) =>
		listFinanceTransactions(ctx),
	),
	getStudentPurchaseSuggestions: authenticatedProcedure
		.input(optionalCompatInput)
		.query(({ ctx }) => listFinanceItems(ctx, { excludeType: "SALARY" })),
	createStudentPurchase: authenticatedProcedure
		.input(legacyChargeInput)
		.mutation(({ ctx, input }) =>
			createFinanceCharge(ctx, normalizeLegacyChargeInput(input, "STUDENT")),
		),
	getCollectionSummary: authenticatedProcedure
		.input(optionalCompatInput)
		.query(({ ctx }) => listFinanceCharges(ctx, { status: "PAID" })),
	getCollectionStudents: authenticatedProcedure
		.input(chargeListInput)
		.query(({ ctx, input }) => listFinanceCharges(ctx, input)),
	deleteBillable: authenticatedProcedure
		.input(optionalCompatInput)
		.mutation(() => ({ ...resetPayload, title: "Deleted" })),
	waiveFee: authenticatedProcedure
		.input(optionalCompatInput)
		.mutation(() => resetPayload),
	applyDiscount: authenticatedProcedure
		.input(optionalCompatInput)
		.mutation(() => resetPayload),
});
