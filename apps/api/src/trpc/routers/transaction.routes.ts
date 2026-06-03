import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";

const transactionResetPayload = {
	success: false,
	message: "The legacy finance transaction module has been reset and is being rebuilt.",
};

const emptyList = () => [] as any[];
const resetResult = () => transactionResetPayload as any;

export const transactionRoutes = createTRPCRouter({
	applyPayment: publicProcedure.input(z.any()).mutation(resetResult),
	cancelStudentFee: publicProcedure.input(z.any()).mutation(resetResult),
	cancelStudentPayment: publicProcedure.input(z.any()).mutation(resetResult),
	createSchoolFee: publicProcedure.input(z.any()).mutation(resetResult),
	createStudentFee: publicProcedure.input(z.any()).mutation(resetResult),
	studentAccounting: publicProcedure.input(z.any()).query(resetResult),
	getTermFees: publicProcedure
		.input(z.object({ termId: z.string().optional().nullable() }).optional())
		.query(
			() =>
				({
					activeFees: [],
					activatableFees: [],
					...transactionResetPayload,
				}) as any,
		),
	getSchoolFees: publicProcedure.query(emptyList),
	deleteSchoolFeeCurrentTerm: publicProcedure.input(z.any()).mutation(resetResult),
	getPreviousTermFees: publicProcedure.query(emptyList),
	importFees: publicProcedure.input(z.any()).mutation(resetResult),
	getFeeApplyPreview: publicProcedure.input(z.any()).query(resetResult),
	applyFeeToClass: publicProcedure.input(z.any()).mutation(resetResult),
	getStudentFees: publicProcedure.query(emptyList),
});
