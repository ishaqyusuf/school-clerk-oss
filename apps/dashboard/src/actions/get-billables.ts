import { PageDataMeta, PageItemData } from "@/types";
import { SearchParamsType } from "@/utils/search-params";

import { prisma } from "@school-clerk/db";

export type BillablePageItem = PageItemData<typeof getBillables>;
export async function getBillables(query: SearchParamsType = {}) {
  const billables = await prisma.billable.findMany({
    where: {
      schoolProfileId: query.schoolProfileId,
    },
    select: {
      amount: true,
      description: true,
      title: true,
      type: true,
      billableHistory: {
        where: {
          current: true,
          termId: query.termId,
        },
      },
    },
  });
  return {
    meta: {} as PageDataMeta,
    data: billables.map((dept) => {
      return dept;
    }),
  };
}
