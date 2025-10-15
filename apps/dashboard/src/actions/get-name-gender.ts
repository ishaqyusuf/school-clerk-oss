"use server";

import { prisma } from "@school-clerk/db";

export async function getNameGender(name) {
  const g = await prisma.students.findMany({
    where: {
      name,
    },
    select: {
      gender: true,
    },
  });
  return g?.[0]?.gender;
}
