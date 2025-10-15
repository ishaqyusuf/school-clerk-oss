import { Prisma } from "@school-clerk/db";

import { SearchParamsType } from "./search-params";

export function whereClassroom(query: SearchParamsType) {
  const where: Prisma.ClassRoomWhereInput = {
    schoolSessionId: query.sessionId,
  };

  return where;
}
