import { z } from "zod";
import { authenticatedProcedure, createTRPCRouter } from "../init";

const financeResetPayload = {
	success: false,
	message: "The legacy finance module has been reset and is being rebuilt.",
};

const emptyList = () => [] as any[];
const resetResult = () => financeResetPayload as any;

export const financeRouter = createTRPCRouter({
	getStreams: authenticatedProcedure
		.input(
			z
				.object({
					filter: z.enum(["term", "session"]).optional(),
					termId: z.string().optional().nullable(),
					sessionId: z.string().optional().nullable(),
				})
				.optional(),
		)
		.query(emptyList),
	getStreamDetails: authenticatedProcedure
		.input(z.object({ streamId: z.string() }))
		.query(resetResult),
	getFinanceIntegrityReport: authenticatedProcedure
		.input(z.object({ termId: z.string().optional().nullable() }).optional())
		.query(
			() =>
				({
					totals: {},
					checks: [],
					mismatches: {},
					...financeResetPayload,
				}) as any,
		),
	getFinanceReports: authenticatedProcedure
		.input(z.object({ termId: z.string().optional().nullable() }).optional())
		.query(
			() =>
				({
					summary: {},
					streams: [],
					payroll: [],
					servicePayments: [],
					collections: [],
					owingLedger: [],
					...financeResetPayload,
				}) as any,
		),
	createStream: authenticatedProcedure.input(z.any()).mutation(resetResult),
	transferFunds: authenticatedProcedure.input(z.any()).mutation(resetResult),
	getInternalTransfers: authenticatedProcedure.input(z.any().optional()).query(emptyList),
	cancelInternalTransfer: authenticatedProcedure.input(z.any()).mutation(resetResult),
	addFund: authenticatedProcedure.input(z.any()).mutation(resetResult),
	withdrawFund: authenticatedProcedure.input(z.any()).mutation(resetResult),
	getServicePayments: authenticatedProcedure.input(z.any().optional()).query(emptyList),
	createServicePayment: authenticatedProcedure.input(z.any()).mutation(resetResult),
	payServiceBill: authenticatedProcedure.input(z.any()).mutation(resetResult),
	repayBillOwing: authenticatedProcedure.input(z.any()).mutation(resetResult),
	cancelServiceBillPayment: authenticatedProcedure.input(z.any()).mutation(resetResult),
	getPayroll: authenticatedProcedure.input(z.any().optional()).query(emptyList),
	createStaffBill: authenticatedProcedure.input(z.any()).mutation(resetResult),
	payStaffBill: authenticatedProcedure.input(z.any()).mutation(resetResult),
	cancelStaffBillPayment: authenticatedProcedure.input(z.any()).mutation(resetResult),
	getStaff: authenticatedProcedure.query(emptyList),
	searchStudentsForPayment: authenticatedProcedure.input(z.any()).query(emptyList),
	getReceivePaymentData: authenticatedProcedure.input(z.any()).query(resetResult),
	getStudentPayments: authenticatedProcedure.input(z.any()).query(emptyList),
	reverseStudentPayment: authenticatedProcedure.input(z.any()).mutation(resetResult),
	receiveStudentPayment: authenticatedProcedure.input(z.any()).mutation(resetResult),
	getBillables: authenticatedProcedure.query(emptyList),
	createBillable: authenticatedProcedure.input(z.any()).mutation(resetResult),
	deleteBillable: authenticatedProcedure.input(z.any()).mutation(resetResult),
	generateBillsFromBillables: authenticatedProcedure.input(z.any()).mutation(resetResult),
	backfillBillSettlements: authenticatedProcedure.input(z.any().optional()).mutation(resetResult),
	getBills: authenticatedProcedure.query(emptyList),
	createBill: authenticatedProcedure.input(z.any()).mutation(resetResult),
	getTransactions: authenticatedProcedure.query(emptyList),
	getStudentPurchaseSuggestions: authenticatedProcedure.input(z.any()).query(emptyList),
	createStudentPurchase: authenticatedProcedure.input(z.any()).mutation(resetResult),
	getCollectionSummary: authenticatedProcedure.input(z.any().optional()).query(emptyList),
	getCollectionStudents: authenticatedProcedure.input(z.any()).query(emptyList),
	waiveFee: authenticatedProcedure.input(z.any()).mutation(resetResult),
	applyDiscount: authenticatedProcedure.input(z.any()).mutation(resetResult),
});
