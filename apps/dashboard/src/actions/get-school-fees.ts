import { PageItemData } from "@/types";
import { SearchParamsType } from "@/utils/search-params";

import { prisma } from "@school-clerk/db";
import { getAuthCookie } from "./cookies/auth-cookie";

export type SchoolFeePageItem = PageItemData<typeof getSchoolFees>;
export async function getSchoolFees(
  query: SearchParamsType = {},
  tx: typeof prisma = prisma
) {
  const profile = await getAuthCookie();
  const fees = await tx.fees.findMany({
    where: {
      schoolProfileId: profile.schoolId,
      title: query.title || undefined,
      feeHistory: query.termId
        ? {
            some: {
              termId: query.termId,
            },
          }
        : undefined,
    },
    select: {
      amount: true,
      description: true,
      title: true,
      feeHistory: {
        where: {
          termId: query.termId || undefined,
          deletedAt: null,
        },
        // schoolSessionId: profile.sessionId,
        select: {
          schoolSessionId: true,
          amount: true,
          termId: true,
          id: true,
        },
      },
    },
  });
  return {
    meta: {},
    data: fees.map((dept) => {
      return dept;
    }),
  };
}
