import { PageDataMeta, PageItemData } from "@/types";
import { SearchParamsType } from "@/utils/search-params";

import { prisma } from "@school-clerk/db";
import { getAuthCookie } from "./cookies/auth-cookie";

export type PageItem = PageItemData<typeof getTransactions>;
export async function getTransactions(query: SearchParamsType = {}) {
  const pr = await getAuthCookie();
  const billables = await prisma.walletTransactions.findMany({
    where: {
      wallet: {
        schoolProfileId: query.schoolProfileId,
        sessionTermId: pr.termId,
      },
      OR: [
        {
          billPayment: {
            deletedAt: null,
          },
        },
        {
          studentPayment: {
            deletedAt: null,
            studentTermForm: {
              student: {
                deletedAt: null,
              },
            },
          },
        },
      ],
    },
    select: {
      amount: true,
      summary: true,
      type: true,
      createdAt: true,
      wallet: {
        select: {
          sessionTerm: {
            select: {
              title: true,
              session: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      },
      studentPayment: {
        select: {
          studentTermForm: {
            select: {
              sessionTerm: {
                select: {
                  title: true,
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
                  otherName: true,
                  surname: true,
                },
              },
            },
          },
        },
      },
    },
  });
  return {
    meta: {} as PageDataMeta,
    data: billables.map((tx) => {
      return {
        amount: tx.amount,
        type: tx.type,
        student: tx.studentPayment?.studentTermForm?.student,
        billTerm: tx.studentPayment?.studentTermForm?.sessionTerm,
        invoiceTerm: tx.wallet?.sessionTerm,
      };
    }),
  };
}
