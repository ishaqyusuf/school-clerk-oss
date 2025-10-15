"use server";

import { unstable_cache } from "next/cache";
import { whereClassroom } from "@/utils/where.classroom";

import { prisma } from "@school-clerk/db";

import { getAuthCookie } from "../cookies/auth-cookie";

export async function getCachedBillables() {
  const profile = await getAuthCookie();
  return unstable_cache(
    async () => {
      const items = await prisma.billable.findMany({
        where: {
          schoolProfileId: profile.schoolId,
        },
        select: {
          id: true,
          description: true,
          title: true,
          amount: true,
          billableHistory: {
            where: {
              current: true,
            },
            take: 1,
            select: {
              amount: true,
              id: true,
            },
          },
        },
      });
      return items.map((item) => {
        return {
          id: item.id,
          title: item.title,
          description: item.description,
          historyId: item?.billableHistory?.[0]?.id,
          amount: item?.billableHistory?.[0]?.amount,
        };
      });
    },
    [`billables_${profile.termId}`],
    {
      tags: [`billables_${profile.termId}`],
    }
  )();
}
