"use server";

import { z } from "zod";

import { prisma } from "@school-clerk/db";

import { classChanged } from "./cache/cache-control";
import { getAuthCookie } from "./cookies/auth-cookie";
import { actionClient } from "./safe-action";
import { createClassroomSchema } from "./schema";
import { transaction } from "@/utils/db";
import { getClassRooms } from "./get-class-rooms";

export type CreateClassRoom = z.infer<typeof createClassroomSchema>;
export async function createClassroom(
  data: CreateClassRoom,
  tx: typeof prisma = prisma
) {
  const profile = await getAuthCookie();

  if (!data.departments?.length)
    data.departments = [
      {
        name: data.className,
      },
    ];
  // const classRoom = await tx.classRoom.findFirst({
  //   where: {
  //     name: data.className,
  //     schoolSessionId: profile.sessionId,
  //   },
  // });
  // console.log({ classRoom });
  // if (classRoom) return classRoom;
  // try {
  //   const classRoom = await tx.classRoom.create({
  //     data: {
  //       name: data.className,
  //       session: {
  //         connect: { id: profile.sessionId },
  //       },
  //       school: {
  //         connect: {
  //           id: profile.schoolId,
  //         },
  //       },
  //       classRoomDepartments: {
  //         createMany: {
  //           data: data.departments?.map((d) => ({
  //             departmentName: d.name,
  //             schoolProfileId: profile.schoolId,
  //           })),
  //         },
  //       },
  //     },
  //   });
  //   return classRoom;
  // } catch (error) {}
  // return null;

  const resp = await tx.classRoom.upsert({
    where: {
      schoolSessionId_name: {
        name: data.className,
        schoolSessionId: profile.sessionId,
      },
    },
    update: {
      classRoomDepartments: {
        createMany: {
          data: data.departments?.map((d) => ({
            departmentName: d.name,
            schoolProfileId: profile.schoolId,
            departmentLevel: d.departmentLevel,
          })),
          skipDuplicates: true,
        },
      },
    },
    create: {
      name: data.className,
      schoolSessionId: profile.sessionId,
      schoolProfileId: profile.schoolId,
      classRoomDepartments: {
        createMany: {
          data: data.departments?.map((d) => ({
            departmentName: d.name,
            schoolProfileId: profile.schoolId,
            departmentLevel: d.departmentLevel,
          })),
        },
      },
    },
    include: {
      classRoomDepartments: true,
    },
  });
  return resp;
}
export const createClassroomAction = actionClient
  .schema(createClassroomSchema)
  .action(async ({ parsedInput: data }) => {
    const resp = await transaction(async (tx) => {
      const profile = await getAuthCookie();
      const resp = await createClassroom(data, tx);
      classChanged();
      return resp;
    });
    return resp;
  });
