"use server";

import { PageDataMeta, PageItemData } from "@/types";
import { SearchParamsType } from "@/utils/search-params";
import { whereStaff } from "@/utils/where.staff";

import { prisma } from "@school-clerk/db";

import { getAuthCookie } from "./cookies/auth-cookie";

export type ListItem = PageItemData<typeof getStaffListAction>;
export async function getStaffListAction(query: SearchParamsType = {}) {
  const profile = await getAuthCookie();
  query.sessionId = profile.sessionId;
  const where = whereStaff(query);
  const students = await prisma.staffProfile.findMany({
    where,
    select: {
      id: true,
      name: true,
      title: true,
      termProfiles: {
        where: {
          deletedAt: null,
          schoolSessionId: profile.sessionId,
          sessionTermId: profile.termId,
        },
        take: 1,
        select: {
          id: true,
        },
      },
    },
  });
  return {
    meta: {} as PageDataMeta,
    data: students.map(({ termProfiles, ...student }) => {
      return {
        ...student,
        staffSessionId: termProfiles?.[0]?.id,
      };
    }),
  };
}
