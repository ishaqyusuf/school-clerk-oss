"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { transaction } from "@/utils/db";
import { z } from "zod";

import { prisma } from "@school-clerk/db";

import { feesChanged } from "./cache/cache-control";
import { getAuthCookie } from "./cookies/auth-cookie";
import { actionClient } from "./safe-action";
import { createBillableSchema, createSchoolFeeSchema } from "./schema";

export type CreateSchoolFeeForm = z.infer<typeof createSchoolFeeSchema>;
export async function createSchoolFee(
  data: CreateSchoolFeeForm,
  tx: typeof prisma
) {
  const profile = await getAuthCookie();
  const fee = await tx.fees.create({
    data: {
      title: data.title,
      amount: data.amount,
      schoolProfileId: profile.schoolId,
      description: data.description,
      feeHistory: {
        create: {
          amount: data.amount,
          current: true,
          schoolSessionId: profile.sessionId,
          termId: profile.termId,
        },
      },
    },
    include: {
      feeHistory: true,
    },
  });
  feesChanged();
  return fee;
}
export const createSchoolFeeAction = actionClient
  .schema(createBillableSchema)
  .action(async ({ parsedInput: data }) => {
    return await transaction(async (tx) => {
      const resp = await createSchoolFee(data, tx);

      return resp;
    });
  });
