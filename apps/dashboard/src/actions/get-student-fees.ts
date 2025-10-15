import { PageDataMeta, PageItemData } from "@/types";
import { SearchParamsType } from "@/utils/search-params";
import { wherStudentFees } from "@/utils/where.student-fees";

import { prisma } from "@school-clerk/db";
import { getAuthCookie } from "./cookies/auth-cookie";

export type PageItem = PageItemData<typeof getStudentFees>;
export async function getStudentFees(query: SearchParamsType = {}) {
  const profile = await getAuthCookie();
  if (query?.termId) query.termId = profile.termId;
  const where = wherStudentFees(query);
  const data = await prisma.studentFee.findMany({
    where,
    select: {
      billAmount: true,
      pendingAmount: true,
      updatedAt: true,
      feeTitle: true,
      description: true,
      studentTermForm: {
        select: {
          sessionForm: {
            select: {
              student: {
                select: {
                  name: true,
                  otherName: true,
                  surname: true,
                },
              },
            },
          },
          sessionTerm: {
            select: {
              title: true,
              id: true,

              session: {
                select: {
                  title: true,
                },
              },
            },
          },
          student: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
  return {
    meta: {} as PageDataMeta,
    data: data.map((dept) => {
      return {
        feeTitle: dept.feeTitle,
        description: dept.description,
        billAmount: dept.billAmount,
        pendingAmount: dept.pendingAmount,
        studentName:
          dept?.studentTermForm?.student?.name ||
          dept.studentTermForm?.sessionForm?.student?.name,
      };
    }),
  };
}
