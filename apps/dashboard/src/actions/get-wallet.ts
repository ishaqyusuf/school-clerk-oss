"use server";

import { prisma } from "@school-clerk/db";

import { walletAdded } from "./cache/cache-control";
import { getAuthCookie } from "./cookies/auth-cookie";

export async function getWalletAction(name, tx: typeof prisma = prisma) {
  const profile = await getAuthCookie();
  const w = await tx.wallet.findFirst({
    where: {
      name,
      schoolProfileId: profile.schoolId,
      sessionTermId: profile.termId,
    },
  });
  if (w) return w;
  const wallet = await tx.wallet.create({
    data: {
      name,
      // schoolProfileId: profile.schoolId,
      schoolProfile: {
        connect: {
          id: profile.schoolId,
        },
      },
      // sessionTermId: profile.termId,
      sessionTerm: {
        connect: {
          id: profile.termId,
        },
      },
    },
  });
  walletAdded();
  return wallet;
}
