"use server";

import { prisma } from "@school-clerk/db";

import { getFinanceCookie } from "./cookies/finance-dashboard";
import { getAuthCookie } from "./cookies/auth-cookie";

export async function getWalletDashboard() {
  const profile = await getAuthCookie();
  await getFinanceCookie();

  const wallets = await prisma.wallet.findMany({
    where: {
      schoolProfileId: profile.schoolId,
      sessionTermId: profile.termId,
    },
    select: {
      id: true,
      studentTransactions: {
        where: { deletedAt: null, status: "success" },
        select: { amount: true, type: true },
      },
      bills: {
        where: { deletedAt: null },
        select: {
          amount: true,
          billPaymentId: true,
          billPayment: {
            select: {
              deletedAt: true,
              transaction: { select: { status: true } },
              invoice: { select: { amount: true, deletedAt: true } },
            },
          },
        },
      },
    },
  });

  const pendingFeeByWalletType = await prisma.studentFee.groupBy({
    by: ["feeTitle"],
    where: {
      studentTermForm: {
        sessionTermId: profile.termId,
      },
      deletedAt: null,
      status: { not: "cancelled" },
    },
    _sum: {
      billAmount: true,
      pendingAmount: true,
    },
  });

  const totalIn = wallets.reduce(
    (sum, wallet) =>
      sum +
      wallet.studentTransactions.reduce(
        (walletSum, transaction) =>
          walletSum + (transaction.type === "credit" ? transaction.amount : 0),
        0,
      ),
    0,
  );
  const totalOut = wallets.reduce(
    (sum, wallet) =>
      sum +
      wallet.studentTransactions.reduce(
        (walletSum, transaction) =>
          walletSum + (transaction.type === "debit" ? transaction.amount : 0),
        0,
      ),
    0,
  );
  const pendingBills = wallets.reduce(
    (sum, wallet) =>
      sum +
      wallet.bills.reduce((billSum, bill) => {
        const isPending =
          !bill.billPaymentId ||
          bill.billPayment?.deletedAt ||
          bill.billPayment?.transaction?.status === "cancelled";
        return billSum + (isPending ? bill.amount || 0 : 0);
      }, 0),
    0,
  );
  const owingAmount = wallets.reduce(
    (sum, wallet) =>
      sum +
      wallet.bills.reduce(
        (billSum, bill) =>
          billSum +
          (bill.billPayment?.deletedAt || bill.billPayment?.invoice?.deletedAt
            ? 0
            : bill.billPayment?.invoice?.amount || 0),
        0,
      ),
    0,
  );
  const pendingFees = pendingFeeByWalletType.reduce(
    (sum, fee) => sum + (fee._sum.pendingAmount ?? 0),
    0,
  );

  return {
    summary: {
      activeStreams: wallets.length,
      totalIn,
      totalOut,
      availableFunds: totalIn - totalOut,
      pendingBills,
      pendingFees,
      owingAmount,
      projectedBalance: totalIn - totalOut - pendingBills - owingAmount,
    },
    pendingFeeByWalletType,
  };
}
