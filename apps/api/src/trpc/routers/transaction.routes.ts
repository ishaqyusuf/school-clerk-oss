import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";
import {
  applyPayment,
  applyPaymentSchema,
  cancelStudentFee,
  cancelStudentFeeSchema,
  cancelStudentPayment,
  cancelStudentPaymentSchema,
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
  cancelStudentPayment: publicProcedure
    .input(cancelStudentPaymentSchema)
    .mutation(async (props) => {
      return cancelStudentPayment(props.ctx, props.input);
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

  getSchoolFees: publicProcedure
    .input(
      z
        .object({
          termId: z.string().optional().nullable(),
          title: z.string().optional().nullable(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const termId = input?.termId || ctx.profile.termId;
      return ctx.db.fees.findMany({
        where: {
          schoolProfileId: ctx.profile.schoolId,
          title: input?.title || undefined,
          feeHistory: termId ? { some: { termId } } : undefined,
        },
        select: {
          id: true,
          amount: true,
          description: true,
          title: true,
          feeHistory: {
            where: { termId: termId || undefined, deletedAt: null },
            select: {
              schoolSessionId: true,
              amount: true,
              termId: true,
              id: true,
            },
          },
        },
      });
    }),

  getStudentFees: publicProcedure
    .input(
      z.object({ termId: z.string().optional().nullable() }).optional()
    )
    .query(async ({ input, ctx }) => {
      const termId = input?.termId || ctx.profile.termId;
      const data = await ctx.db.studentFee.findMany({
        where: {
          schoolProfileId: ctx.profile.schoolId,
          sessionTermId: termId!,
          deletedAt: null,
        },
        select: {
          id: true,
          billAmount: true,
          pendingAmount: true,
          updatedAt: true,
          feeTitle: true,
          description: true,
          studentTermForm: {
            select: {
              sessionForm: {
                select: {
                  student: {
                    select: { name: true, otherName: true, surname: true },
                  },
                },
              },
              sessionTerm: {
                select: {
                  title: true,
                  id: true,
                  session: { select: { title: true } },
                },
              },
              student: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return data.map((d) => ({
        id: d.id,
        feeTitle: d.feeTitle,
        description: d.description,
        billAmount: d.billAmount,
        pendingAmount: d.pendingAmount,
        studentName:
          d.studentTermForm?.student?.name ||
          d.studentTermForm?.sessionForm?.student?.name,
      }));
    }),
});
