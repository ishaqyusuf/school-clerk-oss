"use server";

import { unstable_cache } from "next/cache";
import { whereClassroom } from "@/utils/where.classroom";

import { prisma } from "@school-clerk/db";

import { getAuthCookie } from "../cookies/auth-cookie";

export async function getCachedFees(termId, tx: typeof prisma = prisma) {
  const profile = await getAuthCookie();
  return unstable_cache(
    async () => {
      const _ = await tx.feeHistory.findMany({
        where: {
          termId,
        },
      });
      const items = await tx.feeHistory.findMany({
        where: {
          termId,
          current: true,
        },
        select: {
          id: true,
          amount: true,
          current: true,
          fee: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
        },
      });
      return items.map((item) => ({
        historyId: item.id,
        feeId: item.fee.id,
        title: item.fee.title,
        description: item.fee.description,
        amount: item.amount,
      }));
    },
    [`fees_${termId}`],
    {
      tags: [`fees_${termId}`],
    }
  )();
}
