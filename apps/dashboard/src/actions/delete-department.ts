"use server";

import { transaction } from "@/utils/db";
import { z } from "zod";

import { prisma } from "@school-clerk/db";

import { classChanged } from "./cache/cache-control";
import { getAuthCookie } from "./cookies/auth-cookie";
import { actionClient } from "./safe-action";
import { deleteSchema } from "./schema";

export type Data = z.infer<typeof deleteSchema>;
export async function deleteClassroomDepartment(
  data: Data,
  tx: typeof prisma = prisma
) {
  const resp = await tx.classRoomDepartment.update({
    where: {
      id: data.id,
    },
    data: {
      deletedAt: new Date(),
    },
    select: {
      classRoom: {
        select: {
          id: true,
          _count: {
            select: {
              classRoomDepartments: {
                where: {
                  deletedAt: null,
                },
              },
            },
          },
        },
      },
    },
  });
  const classRoom = resp?.classRoom;
  if (!classRoom?._count?.classRoomDepartments && classRoom?.id)
    await tx.classRoom.update({
      where: {
        id: classRoom.id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
}
export const deleteClassroomDepartmentAction = actionClient
  .schema(deleteSchema)
  .action(async ({ parsedInput: data }) => {
    return await transaction(async (tx) => {
      const resp = await deleteClassroomDepartment(data, tx);
      classChanged();
      return resp;
    });
  });
