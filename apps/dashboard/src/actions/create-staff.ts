"use server";

import { transaction } from "@/utils/db";
import { z } from "zod";

import { prisma } from "@school-clerk/db";

import { staffChanged } from "./cache/cache-control";
import { getAuthCookie } from "./cookies/auth-cookie";
import { actionClient } from "./safe-action";
import { createStaffSchema } from "./schema";

export type Form = z.infer<typeof createStaffSchema>;
export async function createStaff(data: Form, tx: typeof prisma) {
  const profile = await getAuthCookie();
  const resp = await tx.staffProfile.create({
    data: {
      title: data.title,
      schoolProfileId: profile.schoolId,
      name: data.name,
      email: data.email,
      termProfiles: {
        create: {
          schoolSessionId: profile.sessionId,
          sessionTermId: profile.termId,
        },
      },
    },
  });
  staffChanged();
  return resp;
}
export const createStaffAction = actionClient
  .schema(createStaffSchema)
  .action(async ({ parsedInput: data }) => {
    return await transaction(async (tx) => {
      const resp = await createStaff(data, tx);
      return resp;
    });
  });
