"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { transaction } from "@/utils/db";
import { z } from "zod";

import { prisma } from "@school-clerk/db";

import { getAuthCookie } from "./cookies/auth-cookie";
import { createStudentFee } from "./create-student-fee";
import { createStudentFeePayment } from "./create-student-fee-payment";
import { actionClient } from "./safe-action";
import { createStudentSchema } from "./schema";

export type CreateClassRoom = z.infer<typeof createStudentSchema>;
export async function createStudent(
  data: CreateClassRoom,
  tx: typeof prisma = prisma
) {
  const profile = await getAuthCookie();
  const student = await tx.students.create({
    data: {
      gender: data.gender,
      name: data.name,
      otherName: data.otherName,
      surname: data.surname,
      schoolProfileId: profile.schoolId,
      dob: data.dob,
      guardians: !data.guardian
        ? undefined
        : {
            create: {
              guardian: {
                connectOrCreate: {
                  where: {
                    name_phone_schoolProfileId: {
                      name: data.guardian.name,
                      phone: data.guardian.phone,
                      schoolProfileId: profile.schoolId,
                    },
                  },
                  create: {
                    name: data.guardian.name,
                    phone: data.guardian.phone,
                    phone2: data.guardian.phone2,
                    schoolProfileId: profile.schoolId,
                  },
                },
              },
            },
          },
      sessionForms: {
        create: {
          schoolSessionId: profile.sessionId,
          schoolProfileId: profile.schoolId,
          classroomDepartmentId: data.classRoomId || undefined,
          termForms: data?.termForms?.length
            ? {
                createMany: {
                  data: data.termForms.map((termForm) => ({
                    ...termForm,
                    schoolProfileId: profile.schoolId,
                  })),
                },
              }
            : {
                create: {
                  schoolProfileId: profile.schoolId,
                  sessionTermId: profile.termId,
                  schoolSessionId: profile.sessionId,
                },
              },
        },
      },
    },
    include: {
      guardians: {
        include: {
          guardian: true,
        },
      },
      sessionForms: {
        include: {
          classroomDepartment: true,
          termForms: true,
        },
      },
    },
  });
  await tx.studentTermForm.updateMany({
    where: {
      studentSessionFormId: {
        in: student.sessionForms.map((s) => s.id),
      },
      studentId: null,
    },
    data: {
      studentId: student.id,
    },
  });
  // if (data.classRoomId) // revalidateTag(`classroom_students_${data.classRoomId}`);
  // throw new Error("FAILED S");
  return student;
}
export const createStudentAction = actionClient
  .schema(createStudentSchema)
  .action(async ({ parsedInput: data }) => {
    const student = await transaction(async (tx) => {
      if (!data?.guardian?.name) data.guardian = null;
      const student = await createStudent(data, tx);

      const payments = await Promise.all(
        data.fees.map(async (feeData) => {
          const fee = await createStudentFee(
            {
              amount: feeData.amount,
              feeId: feeData.feeId,
              studentTermId: student?.sessionForms?.[0]?.termForms?.[0]?.id,
              title: feeData.title,
              studentId: student.id,
            },
            tx
          );

          if (feeData.paid) {
            const payment = await createStudentFeePayment(
              {
                studentFeeId: fee.id,
                amount: feeData.paid,
                paymentType: fee.description,
                termFormId: fee.studentTermForm.id,
              },
              tx
            );

            return { fee, payment };
          }
          return { fee };
        })
      );

      return { student, payments };
    });
    revalidatePath("/students/list");
    return student;
    // const payments = transaction(async (tx) => {
    //   const respp = await Promise.all(
    //     data.fees.map(async (feeData) => {
    //       const fee = await createStudentFee(
    //         {
    //           amount: feeData.amount,
    //           feeId: feeData.feeId,
    //           studentTermId: student?.sessionForms?.[0]?.termForms?.[0]?.id,
    //           title: feeData.title,
    //         },
    //         tx,
    //       );
    //       console.log({ fee });
    //       if (feeData.paid) {
    //         const payment = await createStudentFeePayment(
    //           {
    //             studentFeeId: fee.id,
    //             amount: feeData.paid,
    //             paymentType: fee.description,
    //             termId: fee.studentTermForm.sessionTermId,
    //           },
    //           tx,
    //         );
    //         console.log({ payment });
    //         return { fee, payment };
    //       }
    //       return { fee };
    //     }),
    //   );
    //   throw new Error("BREAK!");
    //   revalidatePath("/student/list");

    //   return respp;
    // });
    // return {
    //   student,
    //   payments,
    // };
  });
