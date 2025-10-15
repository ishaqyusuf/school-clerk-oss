"use server";

import { unstable_cache } from "next/cache";

import { prisma } from "@school-clerk/db";

import { getAuthCookie } from "../cookies/auth-cookie";

export async function _getWalletTypes() {
  const profile = await getAuthCookie();
  return unstable_cache(
    async () => {
      const items = await prisma.wallet.findMany({
        where: {
          sessionTermId: profile.termId,
        },
        select: {
          name: true,
          id: true,
        },
      });
      return items;
    },
    [`wallets_${profile.termId}`],
    {
      tags: [`wallets_${profile.termId}`],
    }
  )();
}
