"use server";

import { unstable_cache } from "next/cache";
import { whereClassroom } from "@/utils/where.classroom";

import { prisma } from "@school-clerk/db";

import { getAuthCookie } from "../cookies/auth-cookie";

export async function getCachedStaffs() {
  const profile = await getAuthCookie();
  return unstable_cache(
    async () => {
      const items = await prisma.staffProfile.findMany({
        where: {
          schoolProfileId: profile.schoolId,
        },
        select: {
          name: true,
          title: true,
          id: true,
          termProfiles: {
            select: {
              id: true,
            },
            where: {
              sessionTermId: profile.termId,
            },
            take: 1,
          },
        },
      });
      return items.map((item) => ({
        profileId: item.id,
        name: [item.title, item.name].join(" "),
        staffTermId: item.termProfiles?.[0]?.id,
      }));
    },
    [`staffs_${profile.termId}`],
    {
      tags: [`staffs_${profile.termId}`],
    }
  )();
}
