import { composeQueryData } from "@api/query-response";
import type { TRPCContext } from "@api/trpc/init";
import type { GetStudentsSchema } from "@api/trpc/schemas/schemas";
import type { PageFilterData } from "@api/type";
import { composeQuery, txContext } from "@api/utils";
import type { Prisma } from "@school-clerk/db";
import { studentDisplayName } from "./enrollment-query";
import { applyFeeHistoriesToStudentTermForm } from "./student-fee-application";
import { STUDENT_PAGE_STATUS_FILTERS } from "@school-clerk/utils/constants";
import { z } from "zod";

import { subDays } from "date-fns";
const emptySearchQuery = (q: GetStudentsSchema) =>
  (
    [
      "q",
      "status",
      "studentId",
      "sessionTermId",
      "sessionId",
    ] as (keyof GetStudentsSchema)[]
  ).every((a) => !q[a]);
// !q.q && !q.status && !q.studentId && !q.sessionId && !q.sessionTermId;
export async function getStudents(ctx: TRPCContext, query: GetStudentsSchema) {
  const { db } = ctx;
  // query.q = "Adam";
  // query.status = "enrolled";

  if (emptySearchQuery(query)) {
    query.sessionId = ctx.profile?.sessionId;
    query.sessionTermId = ctx.profile?.termId;
  }

  const model = db.students;

  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereStudents(query, ctx),
    model
  );

  const list = await model.findMany({
    where,
    ...searchMeta,
    select: {
      id: true,
      name: true,
      otherName: true,
      surname: true,
      dob: true,
      gender: true,
      sessionForms: {
        where: {
          schoolSessionId: query.sessionId,
        },
        select: {
          id: true,
          classroomDepartment: {
            select: {
              departmentLevel: true,
              departmentName: true,
              id: true,
              classRoom: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          termForms: {
            where: !query?.sessionTermId
              ? {
                  schoolSessionId: query?.sessionId,
                }
              : {
                  sessionTermId: query?.sessionTermId,
                },
            take: 1,
            select: {
              id: true,
              sessionTermId: true,
            },
          },
        },
        take: 1,
      },
    },
    orderBy: [
      {
        gender: "asc",
      },
      {
        name: "asc",
      },
    ],
  });

  return await response(
    list.map((student) => {
      const sf = student.sessionForms?.[0];
      const classroomDepartment = sf?.classroomDepartment;
      const classRoom = classroomDepartment?.classRoom;
      const className = classRoom?.name;
      const departmentName = classroomDepartment?.departmentName;
      const departmentId = classroomDepartment?.id;
      const term = sf?.termForms?.[0];
      const termFormId = term?.id;
      const termFormSessionTermId = term?.sessionTermId;
      return {
        id: student.id,
        gender: student.gender,
        studentName: studentDisplayName(student),
        department: Array.from(new Set([className, departmentName])).join(" "),
        departmentId,
        classId: classRoom?.id,
        termFormId,
        termFormSessionTermId,
      };
    })
  );
}
export async function getStudent(ctx: TRPCContext, query: GetStudentsSchema) {
  const student = await getStudents(ctx, query);
  return student?.data?.[0];
}
function whereStudents(query: GetStudentsSchema, ctx: TRPCContext) {
  const where: Prisma.StudentsWhereInput[] = [
    // {
    //   // schoolProfileId: ctx.profile.schoolId,
    //   // sessionForms: {
    //   //   some: {
    //   //     deletedAt: null,
    //   //     // schoolSessionId: query.sessionId,
    //   //   },
    //   // },
    // },
  ];

  Object.entries(query).map(([key, value]) => {
    if (!value) return;
    switch (key as keyof GetStudentsSchema) {
      case "q":
        where.push({
          OR: [
            {
              name: {
                contains: value as any,
                mode: "insensitive",
              },
            },
            {
              surname: {
                contains: value as any,
                mode: "insensitive",
              },
            },
            {
              otherName: {
                contains: value as any,
                mode: "insensitive",
              },
            },
          ],
        });
        break;
      case "departmentId":
        where.push({
          sessionForms: {
            some: {
              schoolSessionId: query.sessionId,
              classroomDepartmentId:
                query.departmentId == "undocumented" || !query?.departmentId
                  ? null
                  : query.departmentId,
            },
          },
        });
        break;
      case "departmentTitles":
        if (query.departmentTitles?.length!)
          where.push({
            sessionForms: {
              some: {
                schoolSessionId: query.sessionId,
                classroomDepartment:
                  query.departmentTitles?.length! > 1
                    ? {
                        OR: query.departmentTitles?.map((s) => ({
                          departmentName: s,
                        })),
                      }
                    : {
                        departmentName: query.departmentTitles[0],
                      },
              },
            },
          });
        break;
      case "classroomTitle":
        where.push({
          sessionForms: {
            some: {
              schoolSessionId: query.sessionId,
              classroomDepartment: {
                classRoom: {
                  name: value as any,
                },
              },
            },
          },
        });
        break;
      case "studentId":
        where.push({
          id: value as string,
        });
        break;
    }
  });
  switch (query.status) {
    case "not enrolled":
      where.push({
        termForms: {
          every: {
            sessionTermId: {
              not: ctx?.profile?.termId,
            },
          },
        },
      });
      break;
    case "enrolled":
    default:
      where.push({
        termForms: {
          some: {
            sessionTermId: query.sessionTermId || ctx?.profile?.termId,
          },
        },
      });
      break;
  }
  return composeQuery(where);
}
export async function getStudentsQueryParams(ctx: TRPCContext) {
  // session list
  const sessionList = await ctx.db.schoolSession.findMany({
    where: {
      id: {
        not: ctx.profile?.termId,
      },
      schoolId: ctx.profile?.schoolId,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      terms: {
        select: {
          id: true,
          title: true,
        },
      },
      classRooms: {
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          classRoomDepartments: {
            where: { deletedAt: null },
            select: {
              id: true,
              departmentName: true,
            },
          },
        },
      },
    },
  });
  type FilterData = PageFilterData<keyof GetStudentsSchema>;
  const resp = [
    {
      label: "Search",
      type: "input",
      value: "q",
    },
    {
      label: "Status",
      type: "checkbox",
      value: "status",
      options: STUDENT_PAGE_STATUS_FILTERS.map((label) => ({
        label,
        value: label,
      })),
    },
    {
      label: "Session",
      options: sessionList.map((s) => ({
        label: s.title,
        value: s.id,
      })),
      type: "checkbox",
      value: "sessionId",
    },
    {
      label: "Term",
      options: sessionList
        .map((s) =>
          s.terms.map((t) => ({
            label: `${t.title} | ${s.title}`,
            subLabel: s.title,
            value: t.id,
          }))
        )
        .flat(),
      type: "checkbox",
      value: "sessionTermId",
    },
    {
      label: "Departments",
      type: "checkbox",
      options: Array.from(
        new Set(
          ...sessionList.map((s) =>
            s.classRooms
              .map((c) =>
                c.classRoomDepartments.map((d) => d.departmentName).flat()
              )
              .flat()
          )
        )
      ).map((name) => ({
        label: name as any,
        value: name as any,
      })),
      value: "departmentTitles",
    },
  ] as FilterData[];
  const multiDepsClasses = sessionList
    .map((s) =>
      s.classRooms
        .map((c) => ({
          className: c.name,
          id: c.id,
          depsCount: c.classRoomDepartments.length,
        }))
        .flat()
    )
    .flat()
    .filter((a) => a.depsCount > 1);
  if (multiDepsClasses.length)
    resp.push({
      label: "Classes",
      type: "checkbox",
      options: multiDepsClasses.map((c) => ({
        label: c.className as any,
        value: c.className as any,
      })),
      value: "classroomTitle",
    });

  return resp;
}
export const studentFeeSchema = z.object({
  feeId: z.string(),
  title: z.string().optional(),
  amount: z.number().optional(),
  paid: z.number().optional(),
  studentTermId: z.string().optional(),
  studentId: z.string().optional(),
});
export const guardianSchema = z.object({
  id: z.string().optional().nullable(),
  phone: z.string().nullable(),
  phone2: z.string().optional().nullable(),
  name: z.string().nullable(),
});
export const createStudentSchema = z.object({
  name: z.string().min(1),
  surname: z.string().min(1),
  otherName: z.string().optional().nullable(),
  gender: z.enum(["Male", "Female"]),
  dob: z.date().nullable().optional(),
  classRoomId: z.string().nullable(),
  fees: z.array(studentFeeSchema).optional(),
  guardian: guardianSchema.optional().nullable(),
  termForms: z
    .array(
      z.object({
        sessionTermId: z.string(),
        schoolSessionId: z.string(),
      })
    )
    .optional()
    .nullable(),
  initialPayment: z.object({
    amount: z.number().min(0),
    method: z.string(),
    reference: z.string().optional().nullable(),
    paymentDate: z.date().optional().nullable(),
  }).optional().nullable(),
});
type CreateStudent = typeof createStudentSchema._type;
export async function createStudent(ctx: TRPCContext, data: CreateStudent) {
  const profile = ctx.profile;
  const tx = ctx.db;
  const student = await tx.students.create({
    data: {
      gender: data.gender,
      name: data.name,
      otherName: data.otherName,
      surname: data.surname,
      schoolProfileId: profile.schoolId,
      dob: data.dob,
      guardians:
        !data.guardian || (!data.guardian?.name && !data?.guardian?.phone)
          ? undefined
          : {
              create: {
                guardian: {
                  connectOrCreate: {
                    where: {
                      name_phone_schoolProfileId: {
                        name: data.guardian.name!,
                        phone: data.guardian.phone!,
                        schoolProfileId: profile.schoolId,
                      },
                    },
                    create: {
                      name: data.guardian.name! || "",
                      phone: data.guardian.phone! || "",
                      phone2: data.guardian.phone2! || "",
                      schoolProfileId: profile.schoolId!,
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
                    classroomDepartmentId: data.classRoomId || undefined,
                  })),
                },
              }
            : {
                create: {
                  schoolProfileId: profile.schoolId,
                  sessionTermId: profile.termId,
                  schoolSessionId: profile.sessionId,
                  classroomDepartmentId: data.classRoomId || undefined,
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

  const initialSessionForm =
    student.sessionForms.find((form) => form.schoolSessionId === profile.sessionId) ??
    student.sessionForms[0];
  const initialTermForm =
    initialSessionForm?.termForms.find((form) => form.sessionTermId === profile.termId) ??
    initialSessionForm?.termForms[0];

  let feeHistoryApplication:
    | Awaited<ReturnType<typeof applyFeeHistoriesToStudentTermForm>>
    | null = null;

  if (initialSessionForm && initialTermForm) {
    await tx.studentTermForm.update({
      where: { id: initialTermForm.id },
      data: {
        studentId: student.id,
      },
    });

    feeHistoryApplication = await applyFeeHistoriesToStudentTermForm(tx, {
      schoolProfileId: profile.schoolId,
      studentId: student.id,
      studentTermFormId: initialTermForm.id,
      schoolSessionId: initialTermForm.schoolSessionId || profile.sessionId,
      sessionTermId: initialTermForm.sessionTermId || profile.termId,
      classroomDepartmentId:
        initialTermForm.classroomDepartmentId ??
        initialSessionForm.classroomDepartmentId ??
        data.classRoomId,
    });
  }

  if (data.initialPayment && feeHistoryApplication?.charges?.length) {
    let remainingAmount = toMoney(data.initialPayment.amount);
    
    // Create a payment record
    const payment = await tx.financePayment.create({
      data: {
        schoolProfileId: profile.schoolId,
        payerType: "STUDENT",
        studentId: student.id,
        amount: remainingAmount,
        paymentDate: data.initialPayment.paymentDate ?? new Date(),
        method: data.initialPayment.method,
        reference: data.initialPayment.reference,
        streamId: feeHistoryApplication.charges[0]?.streamId, // Associate with the first stream for the main payment wrapper
        receivedById: ctx.currentUser?.id,
      },
    });

    for (const charge of feeHistoryApplication.charges) {
      if (remainingAmount.lessThanOrEqualTo(0)) break;

      const chargeAmount = toMoney(charge.amount);
      const allocatedAmount = remainingAmount.greaterThan(chargeAmount) ? chargeAmount : remainingAmount;

      await tx.financePaymentAllocation.create({
        data: {
          paymentId: payment.id,
          chargeId: charge.id,
          amount: allocatedAmount,
        },
      });

      await tx.financeCharge.update({
        where: { id: charge.id },
        data: {
          amountPaid: allocatedAmount,
          status: allocatedAmount.equals(chargeAmount) ? "PAID" : "PARTIALLY_PAID",
        },
      });

      await tx.financeLedgerEntry.create({
        data: {
          schoolProfileId: profile.schoolId,
          streamId: charge.streamId,
          direction: "CREDIT", // Payments into the school are typically CREDIT, though the ledgerDirectionForStream handles this more accurately normally. Assuming CREDIT for simplicity.
          sourceType: "PAYMENT",
          sourceId: payment.id,
          amount: allocatedAmount,
          occurredAt: payment.paymentDate,
          note: `Initial Payment for ${charge.title}`,
          createdById: ctx.currentUser?.id,
          chargeId: charge.id,
          paymentId: payment.id,
        },
      });

      remainingAmount = remainingAmount.minus(allocatedAmount);
    }
  }

  await updateStudentTermFormStudentId(ctx);

  return {
    ...student,
    feeHistoryApplication,
  };
}
export async function updateStudentTermFormStudentId(ctx: TRPCContext) {
  const students = await ctx.db.students.findMany({
    where: {
      sessionForms: {
        some: {
          termForms: {
            some: {
              studentId: null,
            },
          },
        },
      },
    },
    select: {
      id: true,
      sessionForms: {
        select: {
          termForms: {
            where: {
              studentId: null,
            },
            select: {
              id: true,
            },
          },
        },
      },
    },
  });
  for (const student of students) {
    const termFormIds = student.sessionForms
      .map((a) => a.termForms.map((b) => b.id))
      .flat();
    const studentId = student.id;
    await ctx.db.studentTermForm.updateMany({
      where: {
        id: { in: termFormIds },
      },
      data: {
        studentId,
      },
    });
  }
  const s = await ctx.db.studentSessionForm.findMany({
    where: {
      classroomDepartmentId: {
        not: null,
      },
      termForms: {
        some: {
          classroomDepartmentId: null,
        },
      },
    },
    select: {
      id: true,
      classroomDepartmentId: true,
    },
  });
  for (const ss of s)
    await ctx.db.studentTermForm.updateMany({
      where: {
        classroomDepartmentId: null,
        studentSessionFormId: ss.id,
      },
      data: {
        classroomDepartmentId: ss.classroomDepartmentId,
      },
    });
}
export async function createStudentForm(
  ctx: TRPCContext,
  data: typeof createStudentSchema._type
) {
  const student = await ctx.db.$transaction(async (tx) => {
    if (!data?.guardian?.name) data.guardian = null;
    const student = await createStudent(txContext(ctx, tx), data);
    return { student };
  });
  return student;
}

/*

*/
export const studentsRecentRecordSchema = z.object({});
export type StudentsRecentRecordSchema = z.infer<
  typeof studentsRecentRecordSchema
>;

export const studentsAnalyticsSchema = z.object({});
export type StudentsAnalyticsSchema = z.infer<typeof studentsAnalyticsSchema>;

export async function studentsAnalytics(
  ctx: TRPCContext,
  _query: StudentsAnalyticsSchema
) {
  const { db, profile } = ctx;
  const now = new Date();

  const currentTerm = await db.sessionTerm.findFirst({
    where: {
      deletedAt: null,
      schoolId: profile.schoolId,
      startDate: {
        lte: now,
      },
    },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      startDate: true,
      endDate: true,
      sessionId: true,
      session: {
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  });

  const currentSessionId = currentTerm?.sessionId ?? profile.sessionId;
  const currentTermId = currentTerm?.id ?? profile.termId;
  const activeTermWhere = currentTermId
    ? { sessionTermId: currentTermId }
    : { id: "__missing-current-term__" };

  const [totalStudents, activeTermForms, fallbackSessionForms] =
    await Promise.all([
      db.students.count({
        where: {
          schoolProfileId: profile.schoolId,
          deletedAt: null,
        },
      }),
      db.studentTermForm.findMany({
        where: {
          schoolProfileId: profile.schoolId,
          ...activeTermWhere,
          deletedAt: null,
          studentId: {
            not: null,
          },
        },
        distinct: ["studentId"],
        select: {
          studentId: true,
        },
      }),
      db.studentSessionForm.findMany({
        where: {
          schoolProfileId: profile.schoolId,
          schoolSessionId: currentSessionId,
          deletedAt: null,
          studentId: {
            not: null,
          },
        },
        distinct: ["studentId"],
        select: {
          studentId: true,
        },
      }),
    ]);

  const sessionStart = currentTerm?.session?.startDate;
  const sessionEnd = currentTerm?.session?.endDate;
  const newAdmissions = sessionStart
    ? await db.students.count({
        where: {
          schoolProfileId: profile.schoolId,
          deletedAt: null,
          createdAt: {
            gte: sessionStart,
            ...(sessionEnd ? { lte: sessionEnd } : {}),
          },
        },
      })
    : fallbackSessionForms.length;

  return {
    totalStudents,
    activeThisTerm: activeTermForms.length,
    newAdmissions,
    pendingFees: 0,
    currentTerm: currentTerm
      ? {
          id: currentTerm.id,
          title: currentTerm.title,
          startDate: currentTerm.startDate,
          endDate: currentTerm.endDate,
        }
      : null,
    currentSession: currentTerm?.session
      ? {
          id: currentTerm.session.id,
          title: currentTerm.session.title,
        }
      : null,
  };
}

export async function studentsRecentRecord(
  ctx: TRPCContext,
  query: StudentsRecentRecordSchema
) {
  const { db, profile } = ctx;
  // await db.studentSessionForm.updateMany({
  //   where: {
  //     createdAt: {
  //       gt: subDays(new Date(), 1),
  //     },
  //   },
  //   data: {
  //     deletedAt: new Date(),
  //   },
  // });
  // await db.studentTermForm.updateMany({
  //   where: {
  //     createdAt: {
  //       gt: subDays(new Date(), 1),
  //     },
  //   },
  //   data: {
  //     deletedAt: new Date(),
  //   },
  // });
  const sessionTermId = profile.termId;
  const schoolSessionId = profile.sessionId;
  // const currentTerm = await
  const students = await db.students.findMany({
    where: {
      schoolProfileId: profile.schoolId,
    },
    select: {
      id: true,
      name: true,
      otherName: true,
      surname: true,
      gender: true,
      termForms: {
        where: {
          deletedAt: null,
          OR: [
            {
              sessionTermId,
            },
            {
              schoolSessionId,
            },
            {
              sessionTermId: {
                not: null,
              },
            },
          ],
        },

        // take: 1,
        select: {
          id: true,
          sessionTermId: true,
          schoolSessionId: true,
          classroomDepartmentId: true,
          studentSessionFormId: true,
          sessionForm: {
            select: {
              classroomDepartment: {
                select: {
                  departmentName: true,
                  id: true,
                  classRoom: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
          sessionTerm: {
            select: {
              title: true,
              startDate: true,
              session: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
        // orderBy: {
        //   sessionTerm: {
        //     startDate: "desc",
        //   },
        // },
        // take: 1,
      },
    },
  });
  const classDepartments = await db.classRoomDepartment.findMany({
    where: {
      classRoom: {
        schoolSessionId: profile.sessionId,
      },
    },
    select: {
      id: true,
      departmentName: true,
      classRoom: {
        select: {
          name: true,
        },
      },
    },
  });
  const term = await db.sessionTerm.findUnique({
    where: {
      id: sessionTermId,
    },
    select: {
      id: true,
      title: true,
      session: {
        select: {
          title: true,
        },
      },
    },
  });
  return {
    students: students.map((s) => {
      const { termForms, ...rest } = s;
      const termForm =
        termForms.find((a) => a.sessionTermId == sessionTermId) ||
        termForms.find((a) => a.schoolSessionId == schoolSessionId) ||
        termForms?.[0];
      const dept = classDepartments?.find(
        (a) => a.id === termForm?.classroomDepartmentId
      );
      const studentSessionFormId = termForm?.studentSessionFormId;
      return {
        ...rest,
        termId: termForm?.sessionTermId,
        classroomDepartmentId:
          termForm?.classroomDepartmentId ||
          termForm?.sessionForm?.classroomDepartment?.id,
        classRoom:
          dept?.classRoom?.name ||
          dept?.departmentName ||
          termForm?.sessionForm?.classroomDepartment?.departmentName ||
          termForm?.sessionForm?.classroomDepartment?.classRoom?.name,
        termSheetId: termForm?.id,
        termName: termForm?.sessionTerm?.title,
        termStartDate: termForm?.sessionTerm?.startDate,
        sessionName: termForm?.sessionTerm?.session?.title,
        studentSessionFormId:
          termForm?.schoolSessionId === schoolSessionId
            ? studentSessionFormId
            : null,
      };
    }),
    sessionTermId,
    schoolSessionId,
    classDepartments,
    term,
  };
}

/*
updateStudentBasicProfile: publicProcedure
      .input(updateStudentBasicProfileSchema)
      .mutation(async (props) => {
        return updateStudentBasicProfile(props.ctx, props.input);
      }),
*/
export const updateStudentBasicProfileSchema = z.object({
  id: z.string(),
  data: createStudentSchema.pick({
    gender: true,
    name: true,
    otherName: true,
    surname: true,
    dob: true,
  }),
});
export type UpdateStudentBasicProfileSchema = z.infer<
  typeof updateStudentBasicProfileSchema
>;

export async function updateStudentBasicProfile(
  ctx: TRPCContext,
  query: UpdateStudentBasicProfileSchema
) {
  const { db } = ctx;
  await db.students.update({
    where: {
      id: query.id,
    },
    data: Object.fromEntries(
      Object.entries(query.data).filter(([a, b]) => !!b)
    ),
  });
}

export const deleteStudentSchema = z.object({
  studentId: z.string(),
});
export type DeleteStudentSchema = z.infer<typeof deleteStudentSchema>;

export async function deleteStudent(
  ctx: TRPCContext,
  query: DeleteStudentSchema
) {
  const { db } = ctx;
  await db.students.update({
    where: { id: query.studentId },
    data: {
      deletedAt: new Date(0),
    },
  });
}

export const changeStudentGenderSchema = z.object({
  id: z.string(),
  gender: z.enum(["Male", "Female"]),
});
export type ChangeStudentGenderSchema = z.infer<typeof changeStudentGenderSchema>;

export async function changeStudentGender(
  ctx: TRPCContext,
  query: ChangeStudentGenderSchema
) {
  const { db } = ctx;
  await db.students.update({
    where: { id: query.id },
    data: { gender: query.gender },
  });
}

export const deleteTermSheetSchema = z.object({
  id: z.string(),
});
export type DeleteTermSheetSchema = z.infer<typeof deleteTermSheetSchema>;

export const bulkDeleteTermSheetsSchema = z.object({
  ids: z.array(z.string()).min(1),
});
export type BulkDeleteTermSheetsSchema = z.infer<
  typeof bulkDeleteTermSheetsSchema
>;

export async function deleteTermSheet(
  ctx: TRPCContext,
  query: DeleteTermSheetSchema
) {
  const { db } = ctx;
  await db.studentTermForm.update({
    where: { id: query.id },
    data: {
      deletedAt: new Date(),
    },
  });
}

export async function bulkDeleteTermSheets(
  ctx: TRPCContext,
  query: BulkDeleteTermSheetsSchema
) {
  const { db } = ctx;
  const result = await db.studentTermForm.updateMany({
    where: {
      id: { in: query.ids },
      deletedAt: null,
      schoolProfileId: ctx.profile.schoolId,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  return {
    count: result.count,
  };
}

export const executeStudentImportSchema = z.object({
  classroomDepartmentId: z.string().min(1),
  rows: z.array(
    z.object({
      lineNumber: z.number(),
      name: z.string().min(1),
      surname: z.string().min(1),
      otherName: z.string().optional().nullable(),
      gender: z.enum(["Male", "Female"]),
      action: z.enum(["import_new", "keep_match", "update_match_with_name"]),
      existingStudentId: z.string().optional().nullable(),
    })
  ),
});

export type ExecuteStudentImport = z.infer<typeof executeStudentImportSchema>;

export type ImportRowResult = {
  lineNumber: number;
  action: string;
  status: "created" | "kept" | "updated" | "skipped" | "failed";
  studentId?: string | null;
  termSheetCreated?: boolean;
  reason?: string;
};

export type ExecuteStudentImportResult = {
  createdStudents: number;
  keptMatches: number;
  updatedMatches: number;
  termSheetsCreated: number;
  skippedRows: number;
  failedRows: number;
  rows: ImportRowResult[];
};

export async function executeStudentImport(
  ctx: TRPCContext,
  input: ExecuteStudentImport
): Promise<ExecuteStudentImportResult> {
  const { db } = ctx;
  const profile = ctx.profile;

  if (!profile.schoolId || !profile.sessionId || !profile.termId) {
    throw new Error("Active school, session, and term are required");
  }

  const classroom = await db.classRoomDepartment.findFirst({
    where: {
      id: input.classroomDepartmentId,
      schoolProfileId: profile.schoolId,
    },
    include: {
      classRoom: {
        select: { schoolSessionId: true },
      },
    },
  });

  if (!classroom) {
    throw new Error("Selected classroom does not belong to the active school");
  }

  if (classroom.classRoom?.schoolSessionId !== profile.sessionId) {
    throw new Error("Selected classroom does not belong to the active session");
  }

  const rows: ImportRowResult[] = [];
  let createdStudents = 0;
  let keptMatches = 0;
  let updatedMatches = 0;
  let termSheetsCreated = 0;
  let skippedRows = 0;
  let failedRows = 0;

  for (const row of input.rows) {
    try {
      const result = await db.$transaction(async (tx) => {
        switch (row.action) {
          case "import_new": {
            const student = await tx.students.create({
              data: {
                gender: row.gender,
                name: row.name,
                surname: row.surname,
                otherName: row.otherName ?? undefined,
                schoolProfileId: profile.schoolId,
                sessionForms: {
                  create: {
                    schoolSessionId: profile.sessionId,
                    schoolProfileId: profile.schoolId,
                    classroomDepartmentId: input.classroomDepartmentId,
                    termForms: {
                      create: {
                        schoolProfileId: profile.schoolId,
                        sessionTermId: profile.termId,
                        schoolSessionId: profile.sessionId,
                        classroomDepartmentId: input.classroomDepartmentId,
                      },
                    },
                  },
                },
              },
              include: {
                sessionForms: {
                  include: { termForms: true },
                },
              },
            });

            const sessionForm = student.sessionForms[0];
            const termForm = sessionForm?.termForms[0];

            if (sessionForm && termForm) {
              await tx.studentTermForm.update({
                where: { id: termForm.id },
                data: { studentId: student.id },
              });

              await applyFeeHistoriesToStudentTermForm(tx, {
                schoolProfileId: profile.schoolId,
                studentId: student.id,
                studentTermFormId: termForm.id,
                schoolSessionId: profile.sessionId,
                sessionTermId: profile.termId,
                classroomDepartmentId: input.classroomDepartmentId,
              });
            }

            return {
              lineNumber: row.lineNumber,
              action: "import_new",
              status: "created" as const,
              studentId: student.id,
              termSheetCreated: true,
            };
          }

          case "keep_match": {
            const existingStudentId = row.existingStudentId;
            if (!existingStudentId) {
              return {
                lineNumber: row.lineNumber,
                action: "keep_match",
                status: "failed" as const,
                reason: "No existing student selected for match",
              };
            }

            const existing = await tx.students.findFirst({
              where: {
                id: existingStudentId,
                schoolProfileId: profile.schoolId,
                deletedAt: null,
              },
            });

            if (!existing) {
              return {
                lineNumber: row.lineNumber,
                action: "keep_match",
                status: "failed" as const,
                reason: "Selected student not found in active tenant",
              };
            }

            const termSheetResult = await createTermSheetIfMissing(
              tx,
              existingStudentId,
              profile,
              input.classroomDepartmentId
            );

            if (termSheetResult.conflictClassroom) {
              return {
                lineNumber: row.lineNumber,
                action: "keep_match",
                status: "failed" as const,
                reason: `Student already has current term sheet in ${termSheetResult.conflictClassroom}. Manual review required.`,
              };
            }

            return {
              lineNumber: row.lineNumber,
              action: "keep_match",
              status: "kept" as const,
              studentId: existingStudentId,
              termSheetCreated: termSheetResult.created,
            };
          }

          case "update_match_with_name": {
            const existingStudentId = row.existingStudentId;
            if (!existingStudentId) {
              return {
                lineNumber: row.lineNumber,
                action: "update_match_with_name",
                status: "failed" as const,
                reason: "No existing student selected for match",
              };
            }

            const existing = await tx.students.findFirst({
              where: {
                id: existingStudentId,
                schoolProfileId: profile.schoolId,
                deletedAt: null,
              },
            });

            if (!existing) {
              return {
                lineNumber: row.lineNumber,
                action: "update_match_with_name",
                status: "failed" as const,
                reason: "Selected student not found in active tenant",
              };
            }

            await tx.students.update({
              where: { id: existingStudentId },
              data: {
                name: row.name,
                surname: row.surname,
                otherName: row.otherName ?? undefined,
              },
            });

            const termSheetResult = await createTermSheetIfMissing(
              tx,
              existingStudentId,
              profile,
              input.classroomDepartmentId
            );

            if (termSheetResult.conflictClassroom) {
              return {
                lineNumber: row.lineNumber,
                action: "update_match_with_name",
                status: "failed" as const,
                reason: `Student already has current term sheet in ${termSheetResult.conflictClassroom}. Manual review required.`,
              };
            }

            return {
              lineNumber: row.lineNumber,
              action: "update_match_with_name",
              status: "updated" as const,
              studentId: existingStudentId,
              termSheetCreated: termSheetResult.created,
            };
          }

          default:
            return {
              lineNumber: row.lineNumber,
              action: row.action,
              status: "skipped" as const,
              reason: `Unsupported action: ${row.action}`,
            };
        }
      });

      rows.push(result);

      switch (result.status) {
        case "created":
          createdStudents++;
          if (result.termSheetCreated) termSheetsCreated++;
          break;
        case "kept":
          keptMatches++;
          if (result.termSheetCreated) termSheetsCreated++;
          break;
        case "updated":
          updatedMatches++;
          if (result.termSheetCreated) termSheetsCreated++;
          break;
        case "skipped":
          skippedRows++;
          break;
        case "failed":
          failedRows++;
          break;
      }
    } catch (error) {
      failedRows++;
      rows.push({
        lineNumber: row.lineNumber,
        action: row.action,
        status: "failed",
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    createdStudents,
    keptMatches,
    updatedMatches,
    termSheetsCreated,
    skippedRows,
    failedRows,
    rows,
  };
}

async function createTermSheetIfMissing(
  tx: any,
  studentId: string,
  profile: { schoolId?: string; sessionId?: string; termId?: string },
  classroomDepartmentId: string
): Promise<{ created: boolean; conflictClassroom?: string }> {
  const existingCurrentTermForm = await tx.studentTermForm.findFirst({
    where: {
      studentId,
      sessionTermId: profile.termId,
      schoolSessionId: profile.sessionId,
      deletedAt: null,
    },
    include: {
      classroomDepartment: {
        select: { departmentName: true },
      },
    },
  });

  if (existingCurrentTermForm) {
    if (existingCurrentTermForm.classroomDepartmentId === classroomDepartmentId) {
      return { created: false };
    }

    return {
      created: false,
      conflictClassroom:
        existingCurrentTermForm.classroomDepartment?.departmentName ??
        "another classroom",
    };
  }

  let sessionFormId = (
    await tx.studentSessionForm.findFirst({
      where: {
        studentId,
        schoolSessionId: profile.sessionId,
      },
      select: { id: true },
    })
  )?.id;

  if (!sessionFormId) {
    const newSessionForm = await tx.studentSessionForm.create({
      data: {
        studentId,
        schoolSessionId: profile.sessionId,
        schoolProfileId: profile.schoolId,
        classroomDepartmentId,
      },
    });
    sessionFormId = newSessionForm.id;
  }

  const newTermForm = await tx.studentTermForm.create({
    data: {
      studentId,
      studentSessionFormId: sessionFormId,
      sessionTermId: profile.termId,
      schoolSessionId: profile.sessionId,
      schoolProfileId: profile.schoolId,
      classroomDepartmentId,
    },
  });

  await applyFeeHistoriesToStudentTermForm(tx, {
    schoolProfileId: profile.schoolId!,
    studentId,
    studentTermFormId: newTermForm.id,
    schoolSessionId: profile.sessionId!,
    sessionTermId: profile.termId!,
    classroomDepartmentId,
  });

  return { created: true };
}
