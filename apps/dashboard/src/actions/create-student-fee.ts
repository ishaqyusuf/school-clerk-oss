"use server";

import { revalidatePath } from "next/cache";
import { transaction } from "@/utils/db";
import { z } from "zod";

import { prisma } from "@school-clerk/db";

import { getAuthCookie } from "./cookies/auth-cookie";
import { actionClient } from "./safe-action";
import { studentFeeSchema } from "./schema";
import { createStudentFeePayment } from "./create-student-fee-payment";

export type Type = z.infer<typeof studentFeeSchema>;
export async function createStudentFee(data: Type, tx: typeof prisma = prisma) {
  const profile = await getAuthCookie();
  const fee = await tx.studentFee.create({
    data: {
      feeTitle: data.title,
      billAmount: data.amount,
      pendingAmount: data.amount,
      schoolProfileId: profile.schoolId,
      studentTermFormId: data.studentTermId,
      schoolSessionId: profile.sessionId,
      feeHistoryId: data.feeId,
      studentId: data.studentId,
    },
    select: {
      id: true,
      description: true,
      feeTitle: true,
      studentTermForm: {
        select: {
          id: true,
          sessionTermId: true,
        },
      },
    },
  });
  if (data.paid) {
    await createStudentFeePayment(
      {
        amount: data.paid,
        paymentType: fee.feeTitle,
        studentFeeId: fee.id,
        termFormId: data.studentTermId,
      },
      tx
    );
  }
  return fee;
  // const student = await prisma
}
export const createStudentFeeAction = actionClient
  .schema(studentFeeSchema)
  .action(async ({ parsedInput: data }) => {
    const res = await transaction(async (tx) => {
      const resp = await createStudentFee(data, tx);
      revalidatePath("/student/list");
      return resp;
    });
  });
