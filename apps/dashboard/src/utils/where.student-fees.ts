import { Prisma } from "@school-clerk/db";

import { SearchParamsKeys, SearchParamsType } from "./search-params";
import { composeQuery } from "./utils";

export function wherStudentFees(query: SearchParamsType) {
  const where: Prisma.StudentFeeWhereInput[] = [
    {
      schoolProfileId: query.schoolProfileId,
      studentTermForm: {
        sessionTermId: query.termId || undefined,
        sessionForm: {
          deletedAt: null,
        },
      },
    },
    {
      OR: [
        {
          studentTermForm: {
            sessionTermId: query.termId,
          },
        },
        {
          pendingAmount: {
            gt: 0,
          },
        },
      ],
    },
  ];

  Object.entries(query).map(([key, value]) => {
    if (!value) return;
    switch (key as SearchParamsKeys) {
    }
  });

  return composeQuery(where);
}
