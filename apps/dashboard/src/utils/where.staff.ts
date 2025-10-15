import { Prisma } from "@school-clerk/db";

import { SearchParamsKeys, SearchParamsType } from "./search-params";
import { composeQuery } from "./utils";

export function whereStaff(query: SearchParamsType) {
  const where: Prisma.StaffProfileWhereInput[] = [];

  Object.entries(query).map(([key, value]) => {
    if (!value) return;
    switch (key as SearchParamsKeys) {
    }
  });

  return composeQuery(where);
}
