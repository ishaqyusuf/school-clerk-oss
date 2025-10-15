"use server";

import { transaction } from "@/utils/db";
import { z } from "zod";

import { prisma } from "@school-clerk/db";

import { studentChanged } from "./cache/cache-control";
import { actionClient } from "./safe-action";
import { deleteStudentSchema } from "./schema";
import { revalidateTag } from "next/cache";

export type Data = z.infer<typeof deleteStudentSchema>;
export async function deleteStudent(data: Data, tx: typeof prisma = prisma) {
  const r = await tx.students.update({
    where: {
      id: data.studentId,
    },
    data: {
      deletedAt: new Date(),
      termForms: {
        updateMany: {
          where: {},
          data: {
            deletedAt: new Date(),
          },
        },
      },
      sessionForms: {
        updateMany: {
          where: {},
          data: {
            deletedAt: new Date(),
          },
        },
      },
    },
    select: {
      sessionForms: {
        select: {
          classroomDepartmentId: true,
        },
      },
    },
  });
  r?.sessionForms?.map((s) => {
    // // revalidateTag(`classroom_students_${s.classroomDepartmentId}`);
  });
}
export const deleteStudentAction = actionClient
  .schema(deleteStudentSchema)
  .action(async ({ parsedInput: data }) => {
    return await transaction(async (tx) => {
      const resp = await deleteStudent(data, tx);
      studentChanged();
      return resp;
    });
  });
