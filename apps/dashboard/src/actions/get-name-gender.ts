"use server";

import { prisma } from "@school-clerk/db";
import { requireDashboardModules } from "@/lib/module-access";
import { z } from "zod";

export async function getNameGender(name: string) {
  const { profile } = await requireDashboardModules(["STUDENT_MANAGEMENT"], ["Admin", "Registrar"]);
  const studentName = z.string().trim().min(1).max(200).parse(name);
  const g = await prisma.students.findMany({
    where: {
      name: studentName,
      schoolProfileId: profile.schoolId,
      deletedAt: null,
    },
    select: {
      gender: true,
    },
  });
  return g?.[0]?.gender;
}
