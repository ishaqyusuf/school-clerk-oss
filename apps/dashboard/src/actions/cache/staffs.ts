"use server";

import { unstable_cache } from "next/cache";
import { whereClassroom } from "@/utils/where.classroom";

import { prisma } from "@school-clerk/db";

import { requireDashboardModules } from "@/lib/module-access";

export async function getCachedStaffs() {
  const { profile } = await requireDashboardModules(["STAFF_MANAGEMENT", "ACADEMIC_PROGRAMS"], ["Admin", "Registrar"]);
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
    ["staffs", profile.schoolId, profile.termId ?? "no-term"],
    {
      tags: [`staffs_${profile.termId}`],
    }
  )();
}
