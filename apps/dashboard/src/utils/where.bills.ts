import { Prisma } from "@school-clerk/db";

import { SearchParamsKeys, SearchParamsType } from "./search-params";
import { composeQuery } from "./utils";

export function whereBills(query: SearchParamsType) {
  const where: Prisma.BillsWhereInput[] = [
    {
      schoolProfileId: query.schoolProfileId,
    },
    {
      OR: [
        {
          sessionTermId: query.termId,
        },
        {
          billPayment: null,
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
