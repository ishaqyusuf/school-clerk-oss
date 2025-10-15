"use server";

import { transaction } from "@/utils/db";
import { z } from "zod";

import { prisma } from "@school-clerk/db";

import { subjectChanged } from "./cache/cache-control";
import { getAuthCookie } from "./cookies/auth-cookie";
import { actionClient } from "./safe-action";
import { createSubjectSchema } from "./schema";

export type Form = z.infer<typeof createSubjectSchema>;
export async function createSubject(data: Form, tx: typeof prisma) {
  const profile = await getAuthCookie();
  const resp = await tx.subject.create({
    data: {
      title: data.title,
      schoolProfileId: profile.schoolId,
    },
  });

  subjectChanged();
  return resp;
}
export const createSubjectAction = actionClient
  .schema(createSubjectSchema)
  .action(async ({ parsedInput: data }) => {
    return await transaction(async (tx) => {
      const resp = await createSubject(data, tx);
      return resp;
    });
  });
