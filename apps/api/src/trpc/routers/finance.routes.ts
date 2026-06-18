import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
	createFinanceCharge,
	getFinanceOverview,
	getFinanceStreamDetails,
	getStudentFinanceStatement,
	listFinanceCharges,
	listFinanceItems,
	listFinanceLedgerEntries,
	listFinancePayments,
	listFinanceStaff,
	listFinanceStreams,
	listFinanceTransactions,
	listFinanceTransfers,
	recordFinancePayment,
	reverseFinancePayment,
	searchFinanceStudents,
	transferFinanceFunds,
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
	financePaymentInputSchema,
	financeSearchInputSchema,
	financeStreamDetailsSchema,
	financeStreamInputSchema,
	financeStreamQuerySchema,
	financeStudentQueryCompatSchema,
	financeStudentQuerySchema,
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
			const overview = await getFinanceOverview(ctx);
			return {
				totals: {
					...overview.summary,
					streamAvailableFunds: overview.summary.totalBalance,
					streamPendingBills: 0,
					streamOwing: 0,
					studentPendingFees: 0,
				},
				checks: [
					{
						key: "ledger-balance",
						label: "Ledger balance",
						status: "ok",
						message:
							"Stream balances are computed from finance ledger entries.",
					},
				],
				mismatches: {
					legacyPaymentsWithoutSettlement: [],
					missingStreams: [],
					streamProjectedDeficits: [],
				},
			};
		}),

	getFinanceReports: authenticatedProcedure
		.input(optionalCompatInput)
		.query(async ({ ctx }) => {
			const overview = await getFinanceOverview(ctx);
			return {
				summary: overview.summary,
				streams: overview.streams,
				payroll: await listFinanceCharges(ctx, { staffProfileId: null }),
				servicePayments: [],
				collections: [],
				owingLedger: [],
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
			return reverseFinancePayment(ctx, input);
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
