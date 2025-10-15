import type { StudentFeeStatus, TransactionStatus } from "@api/constants";
import { composeQueryData } from "@api/query-response";
import type { TRPCContext } from "@api/trpc/init";
import type {
  TransactionsQuerySchema,
  TransactionsSummaryQuery,
} from "@api/trpc/schemas/schemas";
import type { ReturnTypeAsync, WalletTypes } from "@api/type";
import { composeQuery, txContext } from "@api/utils";
import { consoleLog, sum } from "@school-clerk/utils";
import { z } from "zod";
import { createActivity } from "./log-activty";
import type { StudentActivityMeta } from "@api/type.activity";
import { studentDisplayName } from "./enrollment-query";
import type { ActivityType, Prisma } from "@school-clerk/db";

export async function getTransactions(
  ctx: TRPCContext,
  query: TransactionsQuerySchema
) {
  if (!query.termId) query.termId = ctx.profile.termId;
  const model = ctx.db.studentFee;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereTransactions(query),
    model
  );
  const list = await model.findMany({
    where,
    ...searchMeta,
    select: {
      id: true,
      //   amount: true,
      //   studentPayment,
    },
  });
}
function whereTransactions(query: TransactionsQuerySchema) {
  const where: Prisma.WalletTransactionsWhereInput[] = [];
  Object.entries(query).forEach(([key, value]) => {
    if (!value) return;
    switch (key as keyof TransactionsQuerySchema) {
    }
  });
  return composeQuery(where);
}

export async function getTransactionsSummary(
  ctx: TRPCContext,
  query: TransactionsSummaryQuery
) {
  const where = whereTransactions(query);
}

/*
applyPayment: publicProcedure
      .input(applyPaymentSchema)
      .mutation(async (props) => {
        return applyPayment(props.ctx.db, props.input);
      }),
*/
export const applyPaymentSchema = z.object({
  amount: z.number(),
  pendingAmount: z.number(),
  termId: z.string().optional().nullable(),
  studentId: z.string(),
  studentFeeId: z.string().optional().nullable(),
  txDate: z.date().optional().nullable(),
});
export type ApplyPayment = typeof applyPaymentSchema._type;

export async function applyPayment(ctx: TRPCContext, data: ApplyPayment) {
  const { db } = ctx;

  return db.$transaction(
    async (tx) => {
      return await __applyPayment(txContext(ctx, tx), data);
    },
    {
      timeout: 20000,
    }
  );
}
async function __applyPayment(ctx: TRPCContext, data: ApplyPayment) {
  const { db: tx } = ctx;
  const money = await tx.studentWalletTransactions.create({
    data: {
      amount: data.amount,
      transactionType: "credit",
      description: "",
      status: "success",
      studentId: data.studentId,
      transactionDate: data.txDate,
    },
    include: {
      student: true,
    },
  });
  const displayName = studentDisplayName(money.student);
  await createActivity(ctx, {
    meta: {
      studentWalletTransactionId: money.id,
      studentId: money.studentId,
      query: `${displayName}`,
    },
    type: "student_payment_received",
    source: "user",
    title: `${displayName}`,
    description: ``,
  });
  const fees = await tx.studentFee.findMany({
    where: {
      id: data.studentFeeId || undefined,
      studentId: data.studentId,
      pendingAmount: {
        gt: 0,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      pendingAmount: true,
      feeTitle: true,
      studentTermFormId: true,
      // feeHistory: {
      //   select: {
      //     fee: {
      //       select: {
      //       }
      //     }
      //   }
      // }
    },
  });
  const wallets: { [n in string]: ReturnTypeAsync<typeof getSchoolWallet> } =
    {};
  async function __wallet(sessionTermId, name, type: WalletTypes) {
    const slug = [sessionTermId, name, type].join("-");
    if (wallets[slug]) return wallets[slug];
    const wallet = await getSchoolWallet(ctx, {
      sessionTermId: data.termId || ctx.profile.termId,
      name: name,
      type: "fee" as WalletTypes,
    });
    wallets[slug] = wallet;
    return wallet;
  }
  let balance = money.amount!;
  while (balance > 0)
    for (const fee of fees) {
      const wallet = await __wallet(data.termId, fee.feeTitle, "fee");
      let amount = fee.pendingAmount;
      let newBalance = balance - amount;
      if (newBalance < 0) {
        amount = balance;
        newBalance = 0;
      }
      balance = newBalance;
      const transaction = await tx.walletTransactions.create({
        data: {
          amount,
          transactionDate: data.txDate,
          status: "success",
          studentPayment: {
            create: {
              type: "FEE",
              paymentType: fee.feeTitle!,
              amount,
              // schoolProfileId: ctx.profile.schoolId,
              studentFee: {
                connect: {
                  id: fee.id,
                },
              },
              status: "success" as TransactionStatus,
              schoolProfile: {
                connect: {
                  id: ctx.profile.schoolId,
                },
              },
              studentTermForm: {
                // term that payment is created.
                connect: {
                  id: fee.studentTermFormId!,
                },
              },
              description: fee.feeTitle,
            },
            // connect: {
            //   id: payment.id,
            // },
          },
          walletId: wallet.id,
          studentWalletTransaction: {
            create: {
              status: "success",
              transactionType: "debit",
              amount,
              student: {
                connect: { id: data.studentId },
              },
            },
          },
        },
      });
      await tx.studentFee.update({
        where: {
          id: fee.id,
        },
        data: {
          pendingAmount: {
            decrement: transaction.amount,
          },
        },
      });
      await createActivity(ctx, {
        meta: {},
        type: "student_payment_transaction_created",
        source: "user",
        title: `${studentDisplayName(money.student)}`,
        description: ``,
      });
    }
}
export async function getTermFees({ db, profile }: TRPCContext, termId) {
  const fees = await db.fees.findMany({
    where: {
      schoolProfileId: profile.schoolId,
    },
    select: {
      id: true,
      amount: true,
      title: true,
      description: true,
      feeHistory: {
        orderBy: {
          updatedAt: "desc",
        },
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          amount: true,
          termId: true,
        },
      },
    },
  });
  const activeFees = fees.filter((f) =>
    f.feeHistory.some((fh) => fh.termId === termId)
  );
  const activatableFees = fees.filter((f) =>
    f.feeHistory.some((fh) => fh.termId !== termId)
  );
  return {
    activeFees: activeFees.map((f) => {
      const { feeHistory, ...rest } = f;
      const currentFeeHistory = feeHistory.find((f) => f.termId == termId);
      return {
        ...rest,
        slug: [rest.title, rest.description].filter(Boolean).join("-"),
        feeHistory: currentFeeHistory,
        feeHistoryId: currentFeeHistory?.id,
        startItem: undefined,
      };
    }),
    activatableFees: activatableFees.map((f, fi) => {
      const { feeHistory, ...rest } = f;
      return {
        ...rest,
        startItem: fi == 0,
        slug: [rest.title, rest.description, rest.amount]
          .filter(Boolean)
          .join("-"),
        amount: feeHistory?.[0]?.amount || rest?.amount,
        feeHistoryId: undefined,
      };
    }),
  };
}
export const createSchoolFeeSchema = z.object({
  amount: z.number(),
  termId: z.string(),
  // sessionId: z.string(),
  title: z.string(),
  feeId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});
export type CreateSchoolFee = z.infer<typeof createSchoolFeeSchema>;

export async function createSchoolFee(
  { db, profile }: TRPCContext,
  data: CreateSchoolFee
) {
  const term = await db.sessionTerm.findUniqueOrThrow({
    where: {
      id: data.termId,
    },
  });
  if (!data.feeId) {
    await db.fees.create({
      data: {
        title: data.title,
        description: data.description,
        amount: data.amount,
        schoolProfileId: profile.schoolId,
        feeHistory: {
          create: {
            amount: data.amount,
            schoolSessionId: term.sessionId,
            termId: data.termId,
            current: true,
          },
        },
      },
    });
  } else {
    await db.fees.update({
      where: {
        id: data.feeId,
      },
      data: {
        title: data.title,
        description: data.description,
        amount: data.amount,
        feeHistory: {
          updateMany: {
            where: {},
            data: {
              current: false,
            },
          },
          create: {
            amount: data.amount,
            schoolSessionId: term.sessionId,
            termId: data.termId,
            current: true,
          },
        },
      },
    });
    // await db.feeHistory.create({
    //   data: {
    //     feeId: data.feeId,
    //     amount: data.amount,
    //     schoolSessionId: data.termId,
    //     termId: data.termId,
    //     current: true,
    //   },
    // });
  }
}

/*
createStudentFee: publicProcedure
      .input(createStudentFeeSchema)
      .mutation(async (props) => {
        return createStudentFee(props.ctx.db, props.input);
      }),
*/
export const createStudentFeeSchema = z.object({
  studentTermId: z.string(),
  studentId: z.string(),
  feeHistoryId: z.string(),
  paymentTermId: z.string().optional().nullable(),
  // payable: z.number(),
  paid: z.number().optional().nullable(),
});
export type CreateStudentFee = z.infer<typeof createStudentFeeSchema>;

export async function createStudentFee(
  ctx: TRPCContext,
  data: CreateStudentFee
) {
  return ctx.db.$transaction(async (tx) => {
    const { profile } = ctx;
    const txCtx = txContext(ctx, tx);
    const feeHistory = await tx.feeHistory.findFirstOrThrow({
      where: {
        id: data.feeHistoryId,
      },
      select: {
        amount: true,

        fee: {
          select: {
            title: true,
            description: true,
          },
        },
      },
    });
    // const walletId = await getSchoolWallet(txCtx, {
    //   sessionTermId: data.paymentTermId || ctx.profile.termId,
    //   name: feeHistory.fee.title,
    //   type: "fee" as WalletTypes,
    // });
    const sf = await tx.studentFee.create({
      data: {
        billAmount: feeHistory.amount,
        pendingAmount: feeHistory.amount, //sum([data.payable, sum([data.paid! * -1])]),
        feeHistoryId: data.feeHistoryId,
        feeTitle: feeHistory.fee.title,
        schoolProfileId: profile.schoolId,
        studentTermFormId: data.studentTermId,
        studentId: data.studentId,
        description: feeHistory.fee.description,
        status: "active" as StudentFeeStatus,
        // receipts: data.paid
        //   ? {
        //       create: {
        //         schoolProfile: {
        //           connect: {
        //             id: profile.schoolId,
        //           },
        //         },
        //         amount: data.paid!,
        //         type: "FEE",
        //         paymentType: "cash" as PaymentTypes,
        //         walletTransaction: {
        //           create: {
        //             status: "success" as TransactionStatus,
        //             amount: data.paid!,
        //             type: "credit" as TransactionTypes,
        //             wallet: {
        //               connect: {
        //                 id: walletId,
        //               },
        //             },
        //           },
        //         },
        //         studentTermForm: {
        //           connect: {
        //             id: data.studentTermId,
        //           },
        //         },
        //       },
        //     }
        //   : undefined,
      },
      include: {
        student: {
          select: {
            name: true,
            otherName: true,
            surname: true,
          },
        },
      },
    });
    if (data.paid)
      await __applyPayment(txCtx, {
        amount: data.paid!,
        pendingAmount: sf.pendingAmount,
        termId: data.paymentTermId || ctx.profile.termId,
        studentId: data.studentId,
        studentFeeId: sf.id,
      });
    // if(data.paid)
    // {
    // await applyPayment(tx)
    // }
    // await createActivity(txCtx, {
    //   type: "student_payment_transaction_created",
    //   title: `${studentDisplayName(sf.student!)}`,
    //   description: `${r.studentFee?.feeTitle}`,
    //   meta: {
    //     transactionId: data.transactionId,
    //     paymentId: data.studentPaymentId,
    //     studentId: r.studentTermForm.studentId,
    //   } as StudentActivityMeta,
    // });
  });
}
export const cancelStudentPaymentSchema = z.object({
  studentPaymentId: z.string(),
  transactionId: z.string(),
});
export type CancelStudentPayment = z.infer<typeof cancelStudentPaymentSchema>;
// export type CancelStudentPayment = z.infer<typeof cancelStudentPaymentSchema>;
export async function cancelStudentPayment(
  ctx: TRPCContext,
  data: CancelStudentPayment
) {
  return ctx.db.$transaction(async (tx) => {
    await tx.walletTransactions.update({
      where: {
        id: data.transactionId,
      },
      data: {
        status: "cancelled",
      },
    });
    const r = await tx.studentPayment.update({
      where: {
        id: data.studentPaymentId,
      },
      data: {
        status: "cancelled",
      },
      select: {
        studentFee: {
          select: {
            feeTitle: true,
          },
        },
        studentTermForm: {
          select: {
            studentId: true,
            student: {
              select: {
                name: true,
                otherName: true,
                surname: true,
              },
            },
          },
        },
      },
    });
    await createActivity(txContext(ctx, tx), {
      type: "student_payment_transaction_cancelled",
      title: `${studentDisplayName(r.studentTermForm.student!)}`,
      description: `${r.studentFee?.feeTitle}`,
      meta: {
        transactionId: data.transactionId,
        paymentId: data.studentPaymentId,
        studentId: r.studentTermForm.studentId,
      } as StudentActivityMeta,
    });
  });
}

export const cancelStudentFeeSchema = z.object({
  id: z.string(),
  reason: z.string().optional().nullable(),
});
export type CancelStudentFee = z.infer<typeof cancelStudentFeeSchema>;

export async function cancelStudentFee(
  ctx: TRPCContext,
  data: CancelStudentFee
) {
  return ctx.db.$transaction(async (tx) => {
    const res = await tx.studentFee.update({
      where: {
        id: data.id,
      },
      data: {
        status: "cancelled",
      },
      include: {
        student: {
          select: {
            id: true,
          },
        },
      },
    });
    await createActivity(txContext(ctx, tx), {
      meta: {
        studentId: res.student?.id,
        studentFeeId: data.id,
      } as StudentActivityMeta,
      type: "student_fee_cancelled" as ActivityType,
      description: data.reason,
      title: `Student fee cancelled`,
    });
  });
}
export async function getSchoolWallet(
  ctx: TRPCContext,
  { name, sessionTermId, type }
) {
  const schoolProfileId = ctx.profile.schoolId;
  const wallet = await ctx.db.wallet.upsert({
    where: {
      name_schoolProfileId_sessionTermId_type: {
        name,
        sessionTermId,
        type,
        schoolProfileId,
      },
    },
    update: {},
    create: {
      name,
      sessionTermId,
      type,
      schoolProfileId,
    },
  });
  return wallet;
}
export async function getStudentAccounting(ctx: TRPCContext, studentId) {
  const fees = (
    await ctx.db.studentFee.findMany({
      where: {
        studentId,
        status: {
          not: "cancelled" as StudentFeeStatus,
        },
      },
      select: {
        id: true,
        pendingAmount: true,
        status: true,
        billAmount: true,
        feeTitle: true,
        description: true,
        studentTermForm: {
          select: {
            sessionTerm: {
              select: {
                title: true,
                startDate: true,
                session: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
        },
        receipts: {
          select: {
            id: true,
            amount: true,
            status: true,
          },
        },
      },
    })
  ).map((a) => ({
    ...a,
    status: a.status as StudentFeeStatus,
    receipts: a.receipts.map((r) => ({
      ...r,
      status: r.status as StudentFeeStatus,
    })),
    termDescription: `${a.studentTermForm?.sessionTerm?.title} ${a.studentTermForm?.sessionTerm?.session?.title}`,
  }));
  const studentWalletTxs = await ctx.db.studentWalletTransactions.findMany({
    where: {
      studentId,
      status: "success",
    },
    select: {
      transactionType: true,
      amount: true,
      description: true,
      transactionDate: true,
      id: true,
    },
  });
  const credit = sum(
    studentWalletTxs.filter((a) => a.transactionType == "credit"),
    "amount"
  );
  const debit = sum(
    studentWalletTxs.filter((a) => a.transactionType == "credit"),
    "amount"
  );
  return {
    fees,
    balance: sum([credit, -1 * debit]),
    pendingAmount: sum(
      fees.filter((f) => f.status == "active").map((a) => a.pendingAmount)
    ),
    payments: studentWalletTxs.filter((a) => a.transactionType === "debit"),
  };
}
