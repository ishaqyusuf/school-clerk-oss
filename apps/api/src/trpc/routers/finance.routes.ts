import { z } from "@hono/zod-openapi";
import { createTRPCRouter, publicProcedure } from "../init";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const streamFilterSchema = z.object({
  filter: z.enum(["term", "session"]).default("term"),
  termId: z.string().optional().nullable(),
  sessionId: z.string().optional().nullable(),
});

const payBillSchema = z.object({
  billId: z.string(),
  amount: z.number().positive(),
  date: z.date().optional().nullable(),
});

async function getOrCreateWallet(
  db: any,
  {
    name,
    type,
    schoolId,
    termId,
  }: { name: string; type: string; schoolId: string; termId: string }
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
  }
) {
  const bill = await db.bills.findFirstOrThrow({
    where: { id: billId, billPaymentId: null },
    select: { walletId: true, title: true },
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

  const transaction = await db.walletTransactions.create({
    data: {
      amount,
      walletId,
      type: "debit",
      status: "success",
      transactionDate: date ?? new Date(),
    },
  });

  const invoice = await db.billInvoice.create({
    data: { amount },
  });

  const payment = await db.billPayment.create({
    data: {
      amount,
      transactionId: transaction.id,
      invoiceId: invoice.id,
      bills: { connect: { id: billId } },
    },
  });

  await db.bills.update({
    where: { id: billId },
    data: { billPaymentId: payment.id },
  });

  return { success: true, paymentId: payment.id };
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const financeRouter = createTRPCRouter({
  // ── Accounting Streams ──────────────────────────────────────────────────────

  getStreams: publicProcedure
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
          studentTransactions: {
            where: { status: "success", deletedAt: null },
            select: { amount: true, type: true },
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
        return {
          id: w.id,
          name: w.name,
          type: w.type,
          totalIn: incoming,
          totalOut: outgoing,
          balance: incoming - outgoing,
        };
      });
    }),

  createStream: publicProcedure
    .input(
      z.object({ name: z.string().min(1), type: z.string().default("fee") })
    )
    .mutation(async ({ input, ctx }) => {
      return getOrCreateWallet(ctx.db, {
        name: input.name,
        type: input.type,
        schoolId: ctx.profile.schoolId!,
        termId: ctx.profile.termId!,
      });
    }),

  transferFunds: publicProcedure
    .input(
      z.object({
        fromWalletId: z.string(),
        toWalletId: z.string(),
        amount: z.number().positive(),
        description: z.string().optional().nullable(),
        date: z.date().optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const note = input.description || "Fund transfer";
      const date = input.date ?? new Date();
      return ctx.db.$transaction(async (tx) => {
        await tx.walletTransactions.create({
          data: {
            amount: input.amount,
            walletId: input.fromWalletId,
            type: "transfer-out",
            summary: note,
            status: "success",
            transactionDate: date,
          },
        });
        await tx.walletTransactions.create({
          data: {
            amount: input.amount,
            walletId: input.toWalletId,
            type: "transfer-in",
            summary: note,
            status: "success",
            transactionDate: date,
          },
        });
        return { success: true };
      });
    }),

  // ── Service Payments ────────────────────────────────────────────────────────

  getServicePayments: publicProcedure
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
          billPaymentId: true,
          createdAt: true,
          billable: { select: { title: true, type: true } },
          billPayment: {
            select: {
              amount: true,
              transaction: { select: { transactionDate: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  createServicePayment: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional().nullable(),
        amount: z.number().positive(),
        date: z.date().optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const wallet = await getOrCreateWallet(ctx.db, {
        name: "Services",
        type: "bill",
        schoolId: ctx.profile.schoolId!,
        termId: ctx.profile.termId!,
      });

      return ctx.db.bills.create({
        data: {
          title: input.title,
          description: input.description,
          amount: input.amount,
          schoolProfileId: ctx.profile.schoolId!,
          schoolSessionId: ctx.profile.sessionId!,
          sessionTermId: ctx.profile.termId!,
          walletId: wallet.id,
        },
        select: { id: true },
      });
    }),

  payServiceBill: publicProcedure
    .input(payBillSchema)
    .mutation(async ({ input, ctx }) => {
      return ctx.db.$transaction(async (tx) => {
        return payBill(tx, {
          billId: input.billId,
          amount: input.amount,
          date: input.date,
          schoolId: ctx.profile.schoolId!,
          termId: ctx.profile.termId!,
        });
      });
    }),

  // ── Payroll ─────────────────────────────────────────────────────────────────

  getPayroll: publicProcedure
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
          billPaymentId: true,
          createdAt: true,
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
              amount: true,
              transaction: { select: { transactionDate: true } },
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

  createStaffBill: publicProcedure
    .input(
      z.object({
        staffProfileId: z.string(),
        title: z.string().min(1),
        description: z.string().optional().nullable(),
        amount: z.number().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.$transaction(async (tx) => {
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

        const wallet = await getOrCreateWallet(tx, {
          name: "Payroll",
          type: "bill",
          schoolId: ctx.profile.schoolId!,
          termId: ctx.profile.termId!,
        });

        return tx.bills.create({
          data: {
            title: input.title,
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
    }),

  payStaffBill: publicProcedure
    .input(payBillSchema)
    .mutation(async ({ input, ctx }) => {
      return ctx.db.$transaction(async (tx) => {
        return payBill(tx, {
          billId: input.billId,
          amount: input.amount,
          date: input.date,
          schoolId: ctx.profile.schoolId!,
          termId: ctx.profile.termId!,
        });
      });
    }),

  // ── Staff list (for payroll form) ───────────────────────────────────────────

  getStaff: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.staffProfile.findMany({
      where: { schoolProfileId: ctx.profile.schoolId, deletedAt: null },
      select: { id: true, name: true, title: true },
      orderBy: { name: "asc" },
    });
  }),

  // ── Student Payments ────────────────────────────────────────────────────────

  getStudentPayments: publicProcedure
    .input(z.object({ studentId: z.string().optional().nullable() }))
    .query(async ({ input, ctx }) => {
      if (!input.studentId) return [];
      return ctx.db.studentPayment.findMany({
        where: {
          schoolProfileId: ctx.profile.schoolId,
          studentTermForm: { student: { id: input.studentId } },
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
              transactionDate: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  reverseStudentPayment: publicProcedure
    .input(
      z.object({
        studentPaymentId: z.string(),
        transactionId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.$transaction(async (tx) => {
        await tx.walletTransactions.update({
          where: { id: input.transactionId },
          data: { status: "cancelled" },
        });
        const payment = await tx.studentPayment.update({
          where: { id: input.studentPaymentId },
          data: { status: "cancelled" },
          select: {
            amount: true,
            studentFee: { select: { id: true } },
          },
        });
        if (payment.studentFee?.id && payment.amount) {
          await tx.studentFee.update({
            where: { id: payment.studentFee.id },
            data: { pendingAmount: { increment: payment.amount } },
          });
        }
        return { success: true };
      });
    }),

  // ── Student Purchase (stationary, uniform, etc.) ────────────────────────────

  createStudentPurchase: publicProcedure
    .input(
      z.object({
        studentId: z.string(),
        studentTermFormId: z.string(),
        title: z.string().min(1),
        description: z.string().optional().nullable(),
        amount: z.number().positive(),
        paid: z.boolean().default(false),
        paymentMethod: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.$transaction(async (tx) => {
        const wallet = await getOrCreateWallet(tx, {
          name: "Sales",
          type: "fee",
          schoolId: ctx.profile.schoolId!,
          termId: ctx.profile.termId!,
        });

        if (!input.paid) {
          const purchase = await tx.studentPurchase.create({
            data: { title: input.title, description: input.description, amount: input.amount, paid: false },
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
          data: { title: input.title, description: input.description, amount: input.amount, paid: true },
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
            walletTransactionId: walletTx.id,
            studentPurchaseId: purchase.id,
          },
        });

        return { success: true };
      });
    }),
});
