"use server";

import { transaction } from "@/utils/db";
import { z } from "zod";

import { prisma } from "@school-clerk/db";

import { staffChanged } from "./cache/cache-control";
import { actionClient } from "./safe-action";

const schema = z.object({
  staffId: z.string(),
  termProfileId: z.string().optional(),
});
export type Data = z.infer<typeof schema>;
export async function deleteStaff(data: Data, tx: typeof prisma = prisma) {
  await tx.staffProfile.update({
    where: {
      id: data.staffId,
    },
    data: {
      deletedAt: data.termProfileId ? undefined : new Date(),
      termProfiles: {
        updateMany: {
          where: {
            id: data.termProfileId ? data.termProfileId : undefined,
          },
          data: {
            deletedAt: new Date(),
          },
        },
      },
    },
  });
}
export const deleteStaffAction = actionClient
  .schema(schema)
  .action(async ({ parsedInput: data }) => {
    return await transaction(async (tx) => {
      const resp = await deleteStaff(data, tx);
      staffChanged();
      return resp;
    });
  });
