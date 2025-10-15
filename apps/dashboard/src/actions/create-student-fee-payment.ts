"use server";

import { transaction } from "@/utils/db";
import { z } from "zod";

import { prisma } from "@school-clerk/db";

import { walletTxChanged } from "./cache/cache-control";
import { getAuthCookie } from "./cookies/auth-cookie";
import { getWalletAction } from "./get-wallet";
import { actionClient } from "./safe-action";
import { studentFeePaymentSchema } from "./schema";

export type CreateClassRoom = z.infer<typeof studentFeePaymentSchema>;
export async function createStudentFeePayment(
  data: CreateClassRoom,
  tx: typeof prisma = prisma
) {
  const profile = await getAuthCookie();

  const wallet = await getWalletAction(data.paymentType, tx);

  const p = await tx.studentFee.update({
    where: {
      id: data.studentFeeId,
    },
    data: {
      receipts: {
        create: {
          type: "FEE",
          description: "x",
          paymentType: data.paymentType,
          amount: data.amount,
          schoolProfile: {
            connect: { id: profile.schoolId },
          },
          studentTermForm: {
            connect: { id: data.termFormId },
          },
          walletTransaction: {
            create: {
              amount: data.amount,
              // walletId: wallet.id,
              type: data.paymentType,
              wallet: {
                connect: {
                  id: wallet.id,
                },
              },
            },
          },
        },
      },
      pendingAmount: {
        decrement: data.amount,
      },
    },
    select: {
      billAmount: true,
      receipts: {
        select: {
          amount: true,
        },
      },
    },
  });
  walletTxChanged(data.paymentType);
  return p;
}
export const createStudentFeePaymentAction = actionClient
  .schema(studentFeePaymentSchema)
  .action(async ({ parsedInput: data }) => {
    return await transaction(async (tx) => {
      const resp = await createStudentFeePayment(data, tx);
      return resp;
    });
  });
