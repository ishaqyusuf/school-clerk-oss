"use server";

import { prisma } from "@school-clerk/db";
import { getAuthCookie } from "./cookies/auth-cookie";

export async function getTermListAction() {
  const tags = ["term-list"];
  const profile = await getAuthCookie();
  // return unstable_cache(
  //   async (profile) => {
  const sessions = await prisma.schoolSession.findMany({
    where: {
      schoolId: profile?.schoolId,
    },
    select: {
      id: true,
      title: true,
      terms: {
        where: {
          deletedAt: null,
        },
        select: {
          title: true,
          id: true,
        },
      },
    },
  });
  return {
    profile,
    sessions,
    current: sessions
      ?.map((s) => {
        const term = s.terms.find((t) => t.id == profile?.termId);
        return {
          term,
          sessionTitle: s.title,
        };
      })
      ?.filter((a) => a.term)?.[0],
  };
  //   },
  //   tags,
  //   {
  //     tags,
  //   },
  // )(profile);
}
