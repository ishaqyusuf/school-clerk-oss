"use server";

import { revalidatePath } from "next/cache";
import { transaction } from "@/utils/db";
import { z } from "zod";

import { applyFeeHistoriesToStudentTermForm, prisma } from "@school-clerk/db";

import { getAuthCookie } from "./cookies/auth-cookie";
import { actionClient } from "./safe-action";
import { createStudentAcademicProfileSchema } from "./schema";

export type CreateClassRoom = z.infer<
  typeof createStudentAcademicProfileSchema
>;
export async function createStudentAcademicProfile(
  data: CreateClassRoom,
  tx: typeof prisma = prisma,
) {
  const profile = await getAuthCookie();
  const student = await tx.students.update({
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
                      admissionType: data.admissionType,
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
                    admissionType: data.admissionType,
                  })),
                },
              },
            },
          },
    },
  });
  const termForms = await tx.studentTermForm.findMany({
    where: {
      schoolProfileId: profile.schoolId,
      studentId: data.studentId,
      sessionTermId: {
        in: data.termIds.map((term) => term.sessionTermId),
      },
    },
  });
  for (const requestedTerm of data.termIds) {
    const termForm = termForms.find(
      (form) =>
        form.sessionTermId === requestedTerm.sessionTermId &&
        form.schoolSessionId === requestedTerm.schoolSessionId,
    );
    const classroomDepartmentId =
      termForm?.classroomDepartmentId ?? data.classroomDepartmentId;
    if (!termForm || !classroomDepartmentId) continue;

    await applyFeeHistoriesToStudentTermForm(tx, {
      schoolProfileId: profile.schoolId,
      studentId: data.studentId,
      studentTermFormId: termForm.id,
      schoolSessionId: requestedTerm.schoolSessionId,
      sessionTermId: requestedTerm.sessionTermId,
      classroomDepartmentId,
      admissionType: data.admissionType,
      studentGender: student.gender,
    });
  }
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
