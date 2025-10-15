"use server";

import { transaction } from "@/utils/db";
import { z } from "zod";

import { prisma } from "@school-clerk/db";

import { billChanged, walletTxChanged } from "./cache/cache-control";
import { getAuthCookie } from "./cookies/auth-cookie";
import { getWalletAction } from "./get-wallet";
import { actionClient } from "./safe-action";
import { createBillSchema } from "./schema";

export type CreateForm = z.infer<typeof createBillSchema>;
export async function createBill(data: CreateForm, tx: typeof prisma) {
  const profile = await getAuthCookie();
  const wallet = await getWalletAction(data.title, tx);
  const resp = await tx.bills.create({
    data: {
      title: data.title,
      description: data.description,
      amount: data.amount,
      sessionTerm: {
        connect: {
          id: profile.termId,
        },
      },
      billable: data.billableId
        ? {
            connect: { id: data.billableId },
          }
        : undefined,
      billableHistory: data.billableHistoryId
        ? {
            connect: { id: data.billableHistoryId },
          }
        : undefined,
      schoolProfile: {
        connect: { id: profile.schoolId },
      },
      staffTermProfile: data.staffTermProfileId
        ? {
            connect: { id: data.staffTermProfileId },
          }
        : undefined,
      schoolSession: {
        connect: { id: profile.sessionId },
      },
      wallet: {
        connect: { id: wallet.id },
      },
    },
  });
  billChanged();
  walletTxChanged(wallet.name);
  return resp;
}
export const createBillAction = actionClient
  .schema(createBillSchema)
  .action(async ({ parsedInput: data }) => {
    return await transaction(async (tx) => {
      const resp = await createBill(data, tx);

      return resp;
    });
  });
