"use server";

import { transaction } from "@/utils/db";
import { z } from "zod";

import { prisma } from "@school-clerk/db";

import { subjectChanged } from "./cache/cache-control";
import { getAuthCookie } from "./cookies/auth-cookie";
import { actionClient } from "./safe-action";

const schema = z.object({
  subjectId: z.string(),
  classDepartmentIds: z.array(z.string()),
});

type Form = z.infer<typeof schema>;
export async function addSubjectToClasses(data: Form, tx: typeof prisma) {
  const profile = await getAuthCookie();
  await tx.departmentSubject.createMany({
    data: data.classDepartmentIds.map((classRoomDepartmentId) => ({
      sessionTermId: profile.termId,
      classRoomDepartmentId,
      subjectId: data.subjectId,
    })),
  });
  subjectChanged();
}
export const addSubjectToClassesAction = actionClient
  .schema(schema)
  .action(async ({ parsedInput: data }) => {
    return await transaction(async (tx) => {
      const resp = await addSubjectToClasses(data, tx);
      return resp;
    });
  });
