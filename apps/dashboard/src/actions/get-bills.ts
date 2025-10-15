import { PageDataMeta, PageItemData } from "@/types";
import { SearchParamsType } from "@/utils/search-params";
import { whereBills } from "@/utils/where.bills";
import { wherStudentFees } from "@/utils/where.student-fees";

import { prisma } from "@school-clerk/db";

export type PageItem = PageItemData<typeof getBills>;
export async function getBills(query: SearchParamsType = {}) {
  const where = whereBills(query);
  const data = await prisma.bills.findMany({
    where,
    select: {
      amount: true,
      description: true,
      billable: {
        select: {
          description: true,
        },
      },
      billPaymentId: true,
      // billPayment: {
      //   select: {
      //     id:true
      //   }
      // },
      staffTermProfile: {
        select: {
          staffProfile: {
            select: {
              name: true,
              id: true,
            },
          },
        },
      },
      sessionTerm: {
        select: {
          title: true,
          id: true,
        },
      },
    },
  });
  return {
    meta: {} as PageDataMeta,
    data: data.map((dept) => {
      return {
        title: dept.staffTermProfile
          ? dept.staffTermProfile?.staffProfile?.name
          : "",
        description: dept.description,
        amount: dept.amount,
        status: dept.billPaymentId ? "PAID" : "PENDING",
      };
    }),
  };
}
