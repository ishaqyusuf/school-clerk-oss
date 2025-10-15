import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";
import {
  applyPayment,
  applyPaymentSchema,
  cancelStudentFee,
  cancelStudentFeeSchema,
  createSchoolFee,
  createSchoolFeeSchema,
  createStudentFee,
  createStudentFeeSchema,
  getStudentAccounting,
  getTermFees,
} from "@api/db/queries/accounting";
export const transactionRoutes = createTRPCRouter({
  applyPayment: publicProcedure
    .input(applyPaymentSchema)
    .mutation(async (props) => {
      return applyPayment(props.ctx, props.input);
    }),
  cancelStudentFee: publicProcedure
    .input(cancelStudentFeeSchema)
    .mutation(async (props) => {
      return cancelStudentFee(props.ctx, props.input);
    }),
  createSchoolFee: publicProcedure
    .input(createSchoolFeeSchema)
    .mutation(async (props) => {
      return createSchoolFee(props.ctx, props.input);
    }),
  createStudentFee: publicProcedure
    .input(createStudentFeeSchema)
    .mutation(async (props) => {
      return createStudentFee(props.ctx, props.input);
    }),

  studentAccounting: publicProcedure
    .input(
      z.object({
        studentId: z.string(),
      })
    )
    .query(async (props) => {
      return getStudentAccounting(props.ctx, props.input.studentId);
    }),
  getTermFees: publicProcedure
    .input(
      z.object({
        termId: z.string(),
      })
    )
    .query(async (props) => {
      const result = await getTermFees(props.ctx, props.input.termId);
      return result;
    }),
});
