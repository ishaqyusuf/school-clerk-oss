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

  // First, ensure subjects exist and collect their IDs
  const subjectIds: string[] = [];
  if (data.subjects && data.subjects.length > 0) {
    for (const title of data.subjects) {
      if (!title.trim()) continue;
      const subject = await tx.subject.upsert({
        where: {
          title_schoolProfileId: {
            title: title.trim(),
            schoolProfileId: profile.schoolId,
          },
        },
        update: {},
        create: {
          title: title.trim(),
          schoolProfileId: profile.schoolId,
        },
      });
      subjectIds.push(subject.id);
    }
  }
  
  console.log("[createClassroom] subjectIds collected:", subjectIds);

  if (data.classRoomId) {
    await tx.classRoom.update({
      where: { id: data.classRoomId! },
      data: {
        name: data.className,
        classLevel: data.classLevel,
      },
    });

    const existingDepartments = await tx.classRoomDepartment.findMany({
        where: {
          classRoomsId: data.classRoomId!,
          deletedAt: null,
        },
        select: { id: true },
      });

      const submittedIds = new Set(
        data.departments
          ?.map((department) => department.id)
          .filter((id): id is string => !!id) ?? [],
      );

      for (const department of data.departments ?? []) {
        if (department.id) {
          await tx.classRoomDepartment.update({
            where: { id: department.id },
            data: {
              departmentName: department.name,
              departmentLevel: department.departmentLevel,
            },
          });
          
          await tx.departmentSubject.deleteMany({
            where: {
              classRoomDepartmentId: department.id,
              subjectId: subjectIds.length > 0 ? { notIn: subjectIds } : undefined,
            },
          });
          if (subjectIds.length > 0) {
            await tx.departmentSubject.createMany({
              data: subjectIds.map((subjectId) => ({
                classRoomDepartmentId: department.id,
                subjectId: subjectId,
              })),
              skipDuplicates: true,
            });
          }
          continue;
        }

        const newDept = await tx.classRoomDepartment.create({
          data: {
            classRoomsId: data.classRoomId!,
            departmentName: department.name,
            departmentLevel: department.departmentLevel,
            schoolProfileId: profile.schoolId,
          },
        });
        
        if (subjectIds.length > 0) {
          await tx.departmentSubject.createMany({
            data: subjectIds.map((subjectId) => ({
              classRoomDepartmentId: newDept.id,
              subjectId: subjectId,
            })),
            skipDuplicates: true,
          });
        }
      }

      for (const department of existingDepartments) {
        if (!submittedIds.has(department.id)) {
          await tx.classRoomDepartment.update({
            where: { id: department.id },
            data: { deletedAt: new Date() },
          });
        }
      }

      return tx.classRoom.findUniqueOrThrow({
        where: { id: data.classRoomId! },
        include: {
          classRoomDepartments: {
            where: { deletedAt: null },
          },
        },
      });
  }
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
      classLevel: data.classLevel,
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
      classLevel: data.classLevel,
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

  if (resp.classRoomDepartments) {
    for (const dept of resp.classRoomDepartments) {
      await tx.departmentSubject.deleteMany({
        where: {
          classRoomDepartmentId: dept.id,
          subjectId: subjectIds.length > 0 ? { notIn: subjectIds } : undefined,
        },
      });
      if (subjectIds.length > 0) {
        await tx.departmentSubject.createMany({
          data: subjectIds.map((subjectId) => ({
            classRoomDepartmentId: dept.id,
            subjectId: subjectId,
          })),
          skipDuplicates: true,
        });
      }
    }
  }

  return resp;
}
export const createClassroomAction = actionClient
  .schema(createClassroomSchema)
  .action(async ({ parsedInput: data }) => {
    const resp = await transaction(async (tx) => {
      const profile = await getAuthCookie();
      console.log("[createClassroomAction] Payload subjects:", data.subjects);
      const resp = await createClassroom(data, tx);
      classChanged();
      return resp;
    });
    return resp;
  });
