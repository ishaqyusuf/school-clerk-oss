"use server";

import { revalidatePath } from "next/cache";
import { transaction } from "@/utils/db";
import { z } from "zod";

import { prisma } from "@school-clerk/db";

import { getAuthCookie } from "./cookies/auth-cookie";
import { actionClient } from "./safe-action";
import { createStudentAcademicProfileSchema } from "./schema";

export type CreateClassRoom = z.infer<
  typeof createStudentAcademicProfileSchema
>;
export async function createStudentAcademicProfile(
  data: CreateClassRoom,
  tx: typeof prisma = prisma
) {
  const profile = await getAuthCookie();
  const student = tx.students.update({
    where: {
      id: data.studentId,
    },
    data: {
      sessionForms: data.sessionFormId
        ? {
            update: {
              where: {
                id: data.sessionFormId,
              },
              data: {
                termForms: {
                  createMany: {
                    data: data.termIds.map((termForm) => ({
                      ...termForm,
                      schoolProfileId: profile.schoolId,
                      studentId: data.studentId,
                      classroomDepartmentId: data?.classroomDepartmentId,
                    })),
                  },
                },
              },
            },
          }
        : {
            create: {
              schoolSessionId: data.termIds[0]?.schoolSessionId,
              schoolProfileId: profile.schoolId,
              classroomDepartmentId: data.classroomDepartmentId,
              termForms: {
                createMany: {
                  data: data.termIds.map((termForm) => ({
                    ...termForm,
                    schoolProfileId: profile.schoolId,
                    studentId: data.studentId,
                  })),
                },
              },
            },
          },
    },
    include: {
      sessionForms: {
        include: {
          termForms: true,
        },
      },
    },
  });
  return student;
}
export const createStudentAcademicProfileAction = actionClient
  .schema(createStudentAcademicProfileSchema)
  .action(async ({ parsedInput: data }) => {
    const student = await transaction(async (tx) => {
      const student = await createStudentAcademicProfile(data, tx);
      return { student };
    });
    revalidatePath("/students/list");
    return student;
  });
