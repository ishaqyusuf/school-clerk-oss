import { composeQueryData } from "@api/query-response";
import type { TRPCContext } from "@api/trpc/init";
import type { GetStudentsSchema } from "@api/trpc/schemas/schemas";
import type { PageFilterData } from "@api/type";
import { composeQuery, txContext } from "@api/utils";
import { Prisma } from "@school-clerk/db";
import { studentDisplayName } from "./enrollment-query";
import { applyFeeHistoriesToStudentTermForm } from "./student-fee-application";
import { assertNoExactDuplicateStudentInClassTerm } from "./student-duplicates";
import { STUDENT_PAGE_STATUS_FILTERS } from "@school-clerk/utils/constants";
import { processStudentImportJobTaskId } from "@school-clerk/utils/task-contracts";
import { auth, tasks } from "@trigger.dev/sdk";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { subDays } from "date-fns";

function toMoney(value: number | string | Prisma.Decimal) {
  return new Prisma.Decimal(value);
}

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

function withDefaultStudentQueryContext(
  ctx: TRPCContext,
  query: GetStudentsSchema,
) {
  return {
    ...query,
    sessionId: query.sessionId || ctx.profile?.sessionId || null,
    sessionTermId: query.sessionTermId || ctx.profile?.termId || null,
  } satisfies GetStudentsSchema;
}

const STUDENT_MANAGEMENT_ROLES = new Set(["ADMIN", "Admin", "Registrar"]);

function requireStudentManagementAccess(ctx: TRPCContext) {
  const schoolProfileId = ctx.profile.schoolId;
  const role = ctx.currentUser?.role;

  if (!schoolProfileId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A school workspace is required.",
    });
  }

  if (!role || !STUDENT_MANAGEMENT_ROLES.has(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to manage student records.",
    });
  }

  return { schoolProfileId };
}

// !q.q && !q.status && !q.studentId && !q.sessionId && !q.sessionTermId;
export async function getStudents(ctx: TRPCContext, query: GetStudentsSchema) {
  const { db } = ctx;
  const effectiveQuery = withDefaultStudentQueryContext(ctx, query);

  const model = db.students;

  const { response, searchMeta, where } = await composeQueryData(
    effectiveQuery,
    whereStudents(effectiveQuery, ctx),
    model,
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
      termForms: {
        where: {
          deletedAt: null,
          ...(effectiveQuery.sessionTermId
            ? { sessionTermId: effectiveQuery.sessionTermId }
            : effectiveQuery.sessionId
              ? { schoolSessionId: effectiveQuery.sessionId }
              : {}),
        },
        take: 1,
        select: {
          id: true,
          sessionTermId: true,
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
        },
      },
      sessionForms: {
        where: {
          schoolSessionId: effectiveQuery.sessionId,
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
            where: !effectiveQuery?.sessionTermId
              ? {
                  schoolSessionId: effectiveQuery?.sessionId,
                }
              : {
                  sessionTermId: effectiveQuery?.sessionTermId,
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
      const term = student.termForms?.[0] ?? sf?.termForms?.[0];
      const classroomDepartment =
        student.termForms?.[0]?.classroomDepartment ?? sf?.classroomDepartment;
      const classRoom = classroomDepartment?.classRoom;
      const className = classRoom?.name;
      const departmentName = classroomDepartment?.departmentName;
      const departmentId = classroomDepartment?.id;
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
    }),
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
          ...(query.departmentId == "undocumented" || !query?.departmentId
            ? {
                sessionForms: {
                  some: {
                    schoolSessionId: query.sessionId,
                    classroomDepartmentId: null,
                  },
                },
              }
            : {
                termForms: {
                  some: {
                    deletedAt: null,
                    sessionTermId: query.sessionTermId || ctx?.profile?.termId,
                    classroomDepartmentId: query.departmentId,
                  },
                },
              }),
        });
        break;
      case "departmentTitles":
        if (query.departmentTitles?.length!)
          where.push({
            termForms: {
              some: {
                deletedAt: null,
                sessionTermId: query.sessionTermId || ctx?.profile?.termId,
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
          termForms: {
            some: {
              deletedAt: null,
              sessionTermId: query.sessionTermId || ctx?.profile?.termId,
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
          })),
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
                c.classRoomDepartments.map((d) => d.departmentName).flat(),
              )
              .flat(),
          ),
        ),
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
        .flat(),
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
      }),
    )
    .optional()
    .nullable(),
  initialPayment: z
    .object({
      amount: z.number().min(0),
      method: z.string(),
      reference: z.string().optional().nullable(),
      paymentDate: z.date().optional().nullable(),
    })
    .optional()
    .nullable(),
});
type CreateStudent = typeof createStudentSchema._type;
export async function createStudent(ctx: TRPCContext, data: CreateStudent) {
  const profile = ctx.profile;
  const tx = ctx.db;
  await assertNoExactDuplicateStudentInClassTerm(tx, {
    schoolProfileId: profile.schoolId,
    sessionTermId: profile.termId,
    classroomDepartmentId: data.classRoomId,
    name: data.name,
    surname: data.surname,
    otherName: data.otherName,
  });

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
    student.sessionForms.find(
      (form) => form.schoolSessionId === profile.sessionId,
    ) ?? student.sessionForms[0];
  const initialTermForm =
    initialSessionForm?.termForms.find(
      (form) => form.sessionTermId === profile.termId,
    ) ?? initialSessionForm?.termForms[0];

  let feeHistoryApplication: Awaited<
    ReturnType<typeof applyFeeHistoriesToStudentTermForm>
  > | null = null;

  if (initialSessionForm && initialTermForm) {
    await tx.studentTermForm.update({
      where: { id: initialTermForm.id },
      data: {
        studentId: student.id,
      },
    });

    const classroomDepartmentId =
      initialTermForm.classroomDepartmentId ??
      initialSessionForm.classroomDepartmentId ??
      data.classRoomId;

    if (classroomDepartmentId) {
      feeHistoryApplication = await applyFeeHistoriesToStudentTermForm(tx, {
        schoolProfileId: profile.schoolId,
        studentId: student.id,
        studentTermFormId: initialTermForm.id,
        schoolSessionId: initialTermForm.schoolSessionId || profile.sessionId,
        sessionTermId: initialTermForm.sessionTermId || profile.termId,
        classroomDepartmentId,
      });
    }
  }

  if (data.initialPayment && feeHistoryApplication?.charges?.length) {
    const firstCharge = feeHistoryApplication.charges[0];
    if (!firstCharge) {
      return {
        ...student,
        feeHistoryApplication,
      };
    }

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
        streamId: firstCharge.streamId, // Associate with the first stream for the main payment wrapper
        receivedById: ctx.currentUser?.id,
      },
    });

    for (const charge of feeHistoryApplication.charges) {
      if (remainingAmount.lessThanOrEqualTo(0)) break;

      const chargeAmount = toMoney(charge.amount);
      const allocatedAmount = remainingAmount.greaterThan(chargeAmount)
        ? chargeAmount
        : remainingAmount;

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
          status: allocatedAmount.equals(chargeAmount)
            ? "PAID"
            : "PARTIALLY_PAID",
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
  data: typeof createStudentSchema._type,
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
  _query: StudentsAnalyticsSchema,
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
  query: StudentsRecentRecordSchema,
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
      deletedAt: null,
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
        (a) => a.id === termForm?.classroomDepartmentId,
      );
      const studentSessionFormId = termForm?.studentSessionFormId;
      return {
        ...rest,
        termId: termForm?.sessionTermId,
        schoolSessionId: termForm?.schoolSessionId,
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
  data: createStudentSchema
    .pick({
      gender: true,
      name: true,
      otherName: true,
      surname: true,
      dob: true,
    })
    .extend({
      guardian: guardianSchema.optional().nullable(),
    }),
});
export type UpdateStudentBasicProfileSchema = z.infer<
  typeof updateStudentBasicProfileSchema
>;

export async function updateStudentBasicProfile(
  ctx: TRPCContext,
  query: UpdateStudentBasicProfileSchema,
) {
  const { db, profile } = ctx;
  if (!profile.schoolId) {
    throw new Error("Active school context is required");
  }

  const guardian = normalizeGuardianInput(query.data.guardian);

  await db.$transaction(async (tx) => {
    const existingStudent = await tx.students.findFirstOrThrow({
      where: {
        id: query.id,
        schoolProfileId: profile.schoolId,
        deletedAt: null,
      },
      select: { id: true },
    });

    const student = await tx.students.update({
      where: {
        id: existingStudent.id,
      },
      data: {
        gender: query.data.gender,
        name: query.data.name,
        otherName: query.data.otherName || null,
        surname: query.data.surname,
        dob: query.data.dob || null,
      },
      select: {
        id: true,
        guardians: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: {
            id: true,
            guardiansId: true,
          },
        },
      },
    });

    const currentGuardianLink = student.guardians[0];

    if (!guardian) {
      if (currentGuardianLink) {
        await tx.studentGuardians.update({
          where: { id: currentGuardianLink.id },
          data: { deletedAt: new Date() },
        });
      }
      return;
    }

    let guardianRecord;

    if (guardian.id) {
      const existingGuardian = await tx.guardians.findFirstOrThrow({
        where: {
          id: guardian.id,
          schoolProfileId: profile.schoolId,
        },
        select: { id: true },
      });

      guardianRecord = await tx.guardians.update({
        where: { id: existingGuardian.id },
        data: {
          name: guardian.name,
          phone: guardian.phone,
          phone2: guardian.phone2 || null,
          deletedAt: null,
        },
      });
    } else {
      guardianRecord = await tx.guardians.upsert({
        where: {
          name_phone_schoolProfileId: {
            name: guardian.name,
            phone: guardian.phone,
            schoolProfileId: profile.schoolId,
          },
        },
        update: {
          name: guardian.name,
          phone2: guardian.phone2 || null,
          deletedAt: null,
        },
        create: {
          name: guardian.name,
          phone: guardian.phone,
          phone2: guardian.phone2 || null,
          schoolProfileId: profile.schoolId,
        },
      });
    }

    if (currentGuardianLink) {
      await tx.studentGuardians.update({
        where: { id: currentGuardianLink.id },
        data: {
          guardiansId: guardianRecord.id,
          deletedAt: null,
        },
      });
      return;
    }

    await tx.studentGuardians.create({
      data: {
        studentId: student.id,
        guardiansId: guardianRecord.id,
      },
    });
  });
}

function normalizeGuardianInput(
  guardian: UpdateStudentBasicProfileSchema["data"]["guardian"],
) {
  const name = guardian?.name?.trim();
  const phone = guardian?.phone?.trim();
  const phone2 = guardian?.phone2?.trim();

  if (!name && !phone && !phone2) return null;
  if (!name || !phone) return null;

  return {
    id: guardian?.id || null,
    name,
    phone,
    phone2: phone2 || null,
  };
}

export const deleteStudentSchema = z.object({
  studentId: z.string(),
});
export type DeleteStudentSchema = z.infer<typeof deleteStudentSchema>;

export async function deleteStudent(
  ctx: TRPCContext,
  query: DeleteStudentSchema,
) {
  const { db } = ctx;
  const { schoolProfileId } = requireStudentManagementAccess(ctx);
  const deletedAt = new Date();
  const result = await db.students.updateMany({
    where: {
      id: query.studentId,
      schoolProfileId,
      deletedAt: null,
    },
    data: { deletedAt },
  });

  if (result.count === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Student was not found in this school workspace.",
    });
  }

  await Promise.all([
    db.studentTermForm.updateMany({
      where: {
        studentId: query.studentId,
        schoolProfileId,
        deletedAt: null,
      },
      data: { deletedAt },
    }),
    db.studentSessionForm.updateMany({
      where: {
        studentId: query.studentId,
        schoolProfileId,
        deletedAt: null,
      },
      data: { deletedAt },
    }),
  ]);
}

export const changeStudentGenderSchema = z.object({
  id: z.string(),
  gender: z.enum(["Male", "Female"]),
});
export type ChangeStudentGenderSchema = z.infer<
  typeof changeStudentGenderSchema
>;

export async function changeStudentGender(
  ctx: TRPCContext,
  query: ChangeStudentGenderSchema,
) {
  const { db } = ctx;
  const schoolProfileId = ctx.profile.schoolId;
  const role = ctx.currentUser?.role;
  const canUpdateGender =
    role === "ADMIN" || role === "Admin" || role === "Registrar";

  if (!schoolProfileId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A school workspace is required to update student gender.",
    });
  }

  if (!canUpdateGender) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to update student gender.",
    });
  }

  const result = await db.students.updateMany({
    where: {
      id: query.id,
      schoolProfileId,
      deletedAt: null,
    },
    data: { gender: query.gender },
  });

  if (result.count === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Student was not found in this school workspace.",
    });
  }
}

export const deleteTermSheetSchema = z.object({
  id: z.string(),
});
export type DeleteTermSheetSchema = z.infer<typeof deleteTermSheetSchema>;

export const changeStudentClassSchema = z.object({
  studentTermFormId: z.string(),
  classroomDepartmentId: z.string(),
});
export type ChangeStudentClassSchema = z.infer<typeof changeStudentClassSchema>;

export const bulkDeleteTermSheetsSchema = z.object({
  ids: z.array(z.string()).min(1),
});
export type BulkDeleteTermSheetsSchema = z.infer<
  typeof bulkDeleteTermSheetsSchema
>;

export async function deleteTermSheet(
  ctx: TRPCContext,
  query: DeleteTermSheetSchema,
) {
  const { db } = ctx;
  const { schoolProfileId } = requireStudentManagementAccess(ctx);
  const result = await db.studentTermForm.updateMany({
    where: {
      id: query.id,
      schoolProfileId,
      deletedAt: null,
    },
    data: { deletedAt: new Date() },
  });

  if (result.count === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Term sheet was not found in this school workspace.",
    });
  }
}

export async function changeStudentClass(
  ctx: TRPCContext,
  query: ChangeStudentClassSchema,
) {
  const { db } = ctx;
  const { schoolProfileId } = requireStudentManagementAccess(ctx);

  await db.$transaction(async (tx) => {
    const classroomDepartment = await tx.classRoomDepartment.findFirst({
      where: {
        id: query.classroomDepartmentId,
        deletedAt: null,
        classRoom: {
          schoolProfileId,
          deletedAt: null,
        },
      },
      select: { id: true },
    });

    if (!classroomDepartment) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Target class was not found in this school workspace.",
      });
    }

    const termForm = await tx.studentTermForm.findFirst({
      where: {
        id: query.studentTermFormId,
        schoolProfileId,
        deletedAt: null,
        student: {
          deletedAt: null,
          schoolProfileId,
        },
      },
      select: {
        id: true,
        studentSessionFormId: true,
        studentId: true,
        sessionTermId: true,
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            otherName: true,
          },
        },
      },
    });

    if (!termForm) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Term sheet was not found in this school workspace.",
      });
    }

    if (termForm.student) {
      await assertNoExactDuplicateStudentInClassTerm(tx, {
        schoolProfileId,
        sessionTermId: termForm.sessionTermId,
        classroomDepartmentId: classroomDepartment.id,
        name: termForm.student.name,
        surname: termForm.student.surname,
        otherName: termForm.student.otherName,
        excludeStudentIds: [termForm.student.id],
      });
    }

    await tx.studentTermForm.update({
      where: { id: termForm.id },
      data: {
        classroomDepartmentId: classroomDepartment.id,
      },
    });

    if (termForm.studentSessionFormId) {
      await tx.studentSessionForm.updateMany({
        where: {
          id: termForm.studentSessionFormId,
          schoolProfileId,
          deletedAt: null,
        },
        data: {
          classroomDepartmentId: classroomDepartment.id,
        },
      });
    }
  });
}

export async function bulkDeleteTermSheets(
  ctx: TRPCContext,
  query: BulkDeleteTermSheetsSchema,
) {
  const { db } = ctx;
  const { schoolProfileId } = requireStudentManagementAccess(ctx);
  const result = await db.studentTermForm.updateMany({
    where: {
      id: { in: query.ids },
      deletedAt: null,
      schoolProfileId,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  return {
    count: result.count,
  };
}

export async function getImportNameGuide(ctx: TRPCContext) {
  const { db, profile } = ctx;
  const students = await db.students.findMany({
    where: {
      schoolProfileId: profile.schoolId,
      deletedAt: null,
    },
    select: {
      name: true,
      surname: true,
      otherName: true,
    },
  });

  const names = Array.from(
    new Set(
      students
        .flatMap((student) => [
          student.name,
          student.surname,
          student.otherName,
        ])
        .map((name) => name?.replace(/\s+/g, " ").trim())
        .filter((name): name is string => Boolean(name)),
    ),
  );

  return { names };
}

function normalizeArabic(str: string): string {
  if (!str) return "";
  str = str
    .normalize("NFC")
    .replace(
      /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\u0640]/g,
      "",
    );
  const map: Record<string, string> = {
    أ: "ا",
    إ: "ا",
    آ: "ا",
    ٱ: "ا",
    ى: "ي",
    ئ: "ي",
    ؤ: "w",
    ة: "ه",
  };
  str = str.replace(/[\u0621-\u06D3\u06FA-\u06FF]/g, (ch) => map[ch] || ch);
  return str.replace(/\s+/g, " ").trim();
}

function normalizeName(str: string): string {
  return normalizeArabic(str).toLowerCase().trim();
}

function levenshteinDistance(s1: string, s2: string): number {
  const track: number[][] = Array(s2.length + 1)
    .fill(undefined)
    .map(() => Array(s1.length + 1).fill(0) as number[]);
  for (let i = 0; i <= s1.length; i += 1) track[0]![i] = i;
  for (let j = 0; j <= s2.length; j += 1) track[j]![0] = j;
  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j]![i] = Math.min(
        track[j]![i - 1]! + 1,
        track[j - 1]![i]! + 1,
        track[j - 1]![i - 1]! + indicator,
      );
    }
  }
  return track[s2.length]![s1.length]!;
}

export const verifyStudentImportSchema = z.object({
  classroomDepartmentId: z.string().optional().nullable(),
  rows: z.array(
    z.object({
      lineNumber: z.number(),
      originalText: z.string(),
      name: z.string().min(1),
      surname: z.string(),
      otherName: z.string().optional().nullable(),
      gender: z.string().optional().nullable(),
      classroomDepartmentId: z.string().optional().nullable(),
    }),
  ),
});

export type VerifyStudentImportSchema = z.infer<
  typeof verifyStudentImportSchema
>;

export async function verifyStudentImport(
  ctx: TRPCContext,
  input: VerifyStudentImportSchema,
) {
  const { db, profile } = ctx;
  const sessionTermId = profile.termId;
  const schoolSessionId = profile.sessionId;

  if (!profile.schoolId || !schoolSessionId || !sessionTermId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Active school, session, and term are required",
    });
  }

  const requestedClassroomIds = Array.from(
    new Set(
      [
        input.classroomDepartmentId,
        ...input.rows.map((row) => row.classroomDepartmentId),
      ].filter((id): id is string => Boolean(id)),
    ),
  );

  const classRoomDepts = await db.classRoomDepartment.findMany({
    where: {
      id: {
        in: requestedClassroomIds,
      },
      classRoom: {
        schoolProfileId: profile.schoolId,
        schoolSessionId: profile.sessionId,
      },
    },
    include: {
      classRoom: true,
    },
  });
  const classRoomDeptById = new Map(
    classRoomDepts.map((classroom) => [classroom.id, classroom]),
  );

  if (classRoomDepts.length !== requestedClassroomIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "One or more selected classroom departments were not found, unauthorized, or not in the active session.",
    });
  }

  // 2. Fetch candidate students
  const existingStudents = await db.students.findMany({
    where: {
      schoolProfileId: profile.schoolId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      surname: true,
      otherName: true,
      gender: true,
      termForms: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          sessionTermId: true,
          schoolSessionId: true,
          classroomDepartmentId: true,
          sessionTerm: {
            select: {
              id: true,
              title: true,
            },
          },
          schoolSession: {
            select: {
              id: true,
              title: true,
            },
          },
          classroomDepartment: {
            select: {
              id: true,
              departmentName: true,
            },
          },
        },
      },
    },
  });

  // 3. Build gender frequency map from normalized first names
  const genderFreq = new Map<string, { male: number; female: number }>();
  for (const s of existingStudents) {
    if (!s.gender) continue;
    const normName = normalizeName(s.name);
    const counts = genderFreq.get(normName) || { male: 0, female: 0 };
    if (s.gender === "Male") {
      counts.male += 1;
    } else if (s.gender === "Female") {
      counts.female += 1;
    }
    genderFreq.set(normName, counts);
  }

  const results: Array<{
    lineNumber: number;
    originalText: string;
    name: string;
    surname: string;
    otherName: string | null;
    inputGender: string | null;
    inferredGender: "Male" | "Female" | null;
    genderInferenceDetails: {
      confidence: number;
      sampleSize: number;
      source: string;
    } | null;
    needsGender: boolean;
    status: "readyToImport" | "matchFound" | "needsAttention";
    classRoom: string | null;
    classroomDepartmentId: string | null;
    fullMatch: MatchMeta | null;
    suspectedMatches: MatchMeta[];
  }> = [];

  interface MatchMeta {
    id: string;
    name: string;
    surname: string | null;
    otherName: string | null;
    gender: string | null;
    classRoom: string | null;
    classroomDepartmentId: string | null;
    studentSessionFormId: string | null;
    studentTermFormId: string | null;
    termId: string | null;
    termName: string | null;
    sessionId: string | null;
    sessionName: string | null;
    isCurrentTermMatch: boolean;
    isCurrentClassroomMatch: boolean;
    confidence: number;
    reason: string;
  }

  for (const row of input.rows) {
    const targetClassroomDepartmentId =
      row.classroomDepartmentId || input.classroomDepartmentId || null;
    const targetClassroom = targetClassroomDepartmentId
      ? classRoomDeptById.get(targetClassroomDepartmentId)
      : null;
    const targetClassroomLabel = targetClassroom
      ? [targetClassroom.classRoom?.name, targetClassroom.departmentName]
          .filter(Boolean)
          .join(" - ")
      : null;
    const inputGender: string | null = (row.gender || null) as string | null;
    let inferredGender: "Male" | "Female" | null = null;
    let genderInferenceDetails: {
      confidence: number;
      sampleSize: number;
      source: string;
    } | null = null;
    let needsGender = false;

    // Check if gender is missing
    if (!inputGender) {
      const normFirstName = normalizeName(row.name);
      const counts = genderFreq.get(normFirstName);
      if (counts) {
        const total = counts.male + counts.female;
        if (total >= 2) {
          const maleRatio = counts.male / total;
          if (maleRatio >= 0.8) {
            inferredGender = "Male";
            genderInferenceDetails = {
              confidence: Math.round(maleRatio * 100),
              sampleSize: total,
              source: "existing_first_names",
            };
          } else if (maleRatio <= 0.2) {
            inferredGender = "Female";
            genderInferenceDetails = {
              confidence: Math.round((1 - maleRatio) * 100),
              sampleSize: total,
              source: "existing_first_names",
            };
          }
        }
      }
      if (!inferredGender) {
        needsGender = true;
      }
    }

    // Matching comparison
    let fullMatch: MatchMeta | null = null;
    const suspectedMatches: MatchMeta[] = [];

    for (const candidate of existingStudents) {
      const normCandName = normalizeName(candidate.name);
      const normCandSurname = normalizeName(candidate.surname ?? "");
      const normCandOtherName = normalizeName(candidate.otherName ?? "");
      const normRowName = normalizeName(row.name);
      const normRowSurname = normalizeName(row.surname);
      const normRowOtherName = normalizeName(row.otherName ?? "");

      // Exact match on all parsed name parts.
      const isExactName = normCandName === normRowName;
      const isExactSurname = normCandSurname === normRowSurname;
      const isExactOtherName = normCandOtherName === normRowOtherName;

      let confidence = 0;
      let reason = "";

      if (isExactName && isExactSurname && isExactOtherName) {
        confidence = 100;
        reason = "Exact match on first name, surname, and other name";
      } else if (isExactName && isExactSurname) {
        const otherNameDist = levenshteinDistance(
          normCandOtherName,
          normRowOtherName,
        );
        confidence = 70;
        reason =
          otherNameDist > 0 && otherNameDist <= 2
            ? `First name and surname match exactly; other name is a suspected typo (edit distance: ${otherNameDist})`
            : "First name and surname match exactly; other name differs";
      } else {
        // Check edit distance for typos
        const nameDist = levenshteinDistance(normCandName, normRowName);
        const surnameDist = levenshteinDistance(
          normCandSurname,
          normRowSurname,
        );

        if (nameDist <= 2 && isExactSurname && isExactOtherName) {
          confidence = 80 - nameDist * 10;
          reason = `Surname matches exactly; first name is a suspected typo (edit distance: ${nameDist})`;
        } else if (surnameDist <= 2 && isExactName && isExactOtherName) {
          confidence = 80 - surnameDist * 10;
          reason = `First name matches exactly; surname is a suspected typo (edit distance: ${surnameDist})`;
        } else if (nameDist <= 2 && surnameDist <= 2 && isExactOtherName) {
          confidence = 60 - (nameDist + surnameDist) * 5;
          reason = `Suspected typos in both first name and surname`;
        }
      }

      if (confidence > 0) {
        // Resolve term sheet / classroom metadata
        const activeTermSheet = candidate.termForms.find(
          (tf) =>
            tf.sessionTermId === sessionTermId &&
            tf.schoolSessionId === schoolSessionId,
        );
        const activeSessionForm = candidate.termForms.find(
          (tf) => tf.schoolSessionId === schoolSessionId,
        );

        const currentTermSheet = activeTermSheet || candidate.termForms[0];

        const matchMeta: MatchMeta = {
          id: candidate.id,
          name: candidate.name,
          surname: candidate.surname,
          otherName: candidate.otherName,
          gender: candidate.gender,
          classRoom:
            currentTermSheet?.classroomDepartment?.departmentName || null,
          classroomDepartmentId:
            currentTermSheet?.classroomDepartment?.id || null,
          studentSessionFormId: null,
          studentTermFormId: currentTermSheet?.id || null,
          termId: currentTermSheet?.sessionTermId || null,
          termName: currentTermSheet?.sessionTerm?.title || null,
          sessionId: currentTermSheet?.schoolSessionId || null,
          sessionName: currentTermSheet?.schoolSession?.title || null,
          isCurrentTermMatch: Boolean(activeTermSheet),
          isCurrentClassroomMatch:
            activeTermSheet?.classroomDepartmentId ===
            targetClassroomDepartmentId,
          confidence,
          reason,
        };

        if (confidence === 100) {
          fullMatch = matchMeta;
        } else {
          suspectedMatches.push(matchMeta);
        }
      }
    }

    // Sort suspected matches by confidence descending, limit to top 5
    suspectedMatches.sort((a, b) => b.confidence - a.confidence);
    const topSuspected = suspectedMatches.slice(0, 5);

    let status: "readyToImport" | "matchFound" | "needsAttention" =
      "readyToImport";
    if (!targetClassroomDepartmentId) {
      status = "needsAttention";
    } else if (fullMatch) {
      status = "matchFound";
    } else if (needsGender || topSuspected.some((m) => m.confidence >= 70)) {
      status = "needsAttention";
    }

    results.push({
      lineNumber: row.lineNumber,
      originalText: row.originalText,
      name: row.name,
      surname: row.surname,
      otherName: row.otherName || null,
      inputGender,
      inferredGender,
      genderInferenceDetails,
      needsGender,
      status,
      classRoom: targetClassroomLabel,
      classroomDepartmentId: targetClassroomDepartmentId,
      fullMatch,
      suspectedMatches: topSuspected,
    });
  }

  return {
    results,
  };
}

export const executeStudentImportSchema = z.object({
  classroomDepartmentId: z.string().optional().nullable(),
  rows: z.array(
    z.object({
      lineNumber: z.number(),
      name: z.string().min(1),
      surname: z.string().min(1),
      otherName: z.string().optional().nullable(),
      gender: z.enum(["Male", "Female"]),
      classroomDepartmentId: z.string().optional().nullable(),
      action: z.enum(["import_new", "keep_match", "update_match_with_name"]),
      existingStudentId: z.string().optional().nullable(),
    }),
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

async function resolveStudentImportClassrooms(
  ctx: TRPCContext,
  input: ExecuteStudentImport,
): Promise<Map<string, any>> {
  const { db } = ctx;
  const profile = ctx.profile;

  if (!profile.schoolId || !profile.sessionId || !profile.termId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Active school, session, and term are required",
    });
  }

  const requestedClassroomIds = Array.from(
    new Set(
      [
        input.classroomDepartmentId,
        ...input.rows.map((row) => row.classroomDepartmentId),
      ].filter((id): id is string => Boolean(id)),
    ),
  );

  if (!requestedClassroomIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "At least one classroom is required",
    });
  }

  const classrooms = await db.classRoomDepartment.findMany({
    where: {
      id: {
        in: requestedClassroomIds,
      },
      schoolProfileId: profile.schoolId,
    },
    include: {
      classRoom: {
        select: { schoolSessionId: true },
      },
    },
  });
  const classroomById = new Map(
    classrooms.map((classroom) => [classroom.id, classroom]),
  );

  if (classrooms.length !== requestedClassroomIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "One or more selected classrooms do not belong to the active school",
    });
  }

  if (
    classrooms.some(
      (classroom) => classroom.classRoom?.schoolSessionId !== profile.sessionId,
    )
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "One or more selected classrooms do not belong to the active session",
    });
  }

  return classroomById;
}

export async function executeStudentImport(
  ctx: TRPCContext,
  input: ExecuteStudentImport,
): Promise<ExecuteStudentImportResult> {
  const { db } = ctx;
  const profile = ctx.profile;
  const classroomById = await resolveStudentImportClassrooms(ctx, input);

  const rows: ImportRowResult[] = [];
  let createdStudents = 0;
  let keptMatches = 0;
  let updatedMatches = 0;
  let termSheetsCreated = 0;
  let skippedRows = 0;
  let failedRows = 0;

  for (const row of input.rows) {
    try {
      const rowClassroomDepartmentId =
        row.classroomDepartmentId || input.classroomDepartmentId || "";
      const rowClassroom = classroomById.get(rowClassroomDepartmentId);

      if (!rowClassroom) {
        rows.push({
          lineNumber: row.lineNumber,
          action: row.action,
          status: "failed",
          reason: "No valid classroom selected for row",
        });
        failedRows++;
        continue;
      }

      const result = await db.$transaction(async (tx) => {
        switch (row.action) {
          case "import_new": {
            await assertNoExactDuplicateStudentInClassTerm(tx, {
              schoolProfileId: profile.schoolId,
              sessionTermId: profile.termId,
              classroomDepartmentId: rowClassroomDepartmentId,
              name: row.name,
              surname: row.surname,
              otherName: row.otherName,
            });

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
                    classroomDepartmentId: rowClassroomDepartmentId,
                    termForms: {
                      create: {
                        schoolProfileId: profile.schoolId,
                        sessionTermId: profile.termId,
                        schoolSessionId: profile.sessionId,
                        classroomDepartmentId: rowClassroomDepartmentId,
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
                classroomDepartmentId: rowClassroomDepartmentId,
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
              rowClassroomDepartmentId,
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
              rowClassroomDepartmentId,
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

export const startStudentImportJobSchema = executeStudentImportSchema;

export const getStudentImportJobSchema = z
  .object({
    jobId: z.string().optional(),
  })
  .optional();

type StudentImportJobRead = {
  id: string;
  status: string;
  totalRows: number;
  processedRows: number;
  createdStudents: number;
  keptMatches: number;
  updatedMatches: number;
  termSheetsCreated: number;
  skippedRows: number;
  failedRows: number;
  errorMessage?: string | null;
  triggerRunId?: string | null;
  triggerAccessToken?: string | null;
  rows: ImportRowResult[];
};

const FINAL_IMPORT_JOB_ROW_STATUSES = new Set([
  "CREATED",
  "KEPT",
  "UPDATED",
  "SKIPPED",
  "FAILED",
]);
const STUDENT_IMPORT_JOB_CHUNK_SIZE = 25;

function importResultStatusToJobRowStatus(status: ImportRowResult["status"]) {
  switch (status) {
    case "created":
      return "CREATED";
    case "kept":
      return "KEPT";
    case "updated":
      return "UPDATED";
    case "skipped":
      return "SKIPPED";
    case "failed":
      return "FAILED";
  }
}

function jobRowStatusToImportResultStatus(
  status: string,
): ImportRowResult["status"] {
  switch (status) {
    case "CREATED":
      return "created";
    case "KEPT":
      return "kept";
    case "UPDATED":
      return "updated";
    case "SKIPPED":
      return "skipped";
    case "FAILED":
      return "failed";
    default:
      return "failed";
  }
}

function summarizeStudentImportJobRows(rows: any[]) {
  const summary = {
    processedRows: 0,
    createdStudents: 0,
    keptMatches: 0,
    updatedMatches: 0,
    termSheetsCreated: 0,
    skippedRows: 0,
    failedRows: 0,
  };

  for (const row of rows) {
    if (!FINAL_IMPORT_JOB_ROW_STATUSES.has(row.status)) continue;
    summary.processedRows += 1;
    if (row.termSheetCreated) summary.termSheetsCreated += 1;

    switch (row.status) {
      case "CREATED":
        summary.createdStudents += 1;
        break;
      case "KEPT":
        summary.keptMatches += 1;
        break;
      case "UPDATED":
        summary.updatedMatches += 1;
        break;
      case "SKIPPED":
        summary.skippedRows += 1;
        break;
      case "FAILED":
        summary.failedRows += 1;
        break;
    }
  }

  return summary;
}

async function createStudentImportJobTriggerAccessToken(runId?: string | null) {
  if (!runId) return null;

  return auth.createPublicToken({
    scopes: {
      read: {
        runs: runId,
      },
    },
    expirationTime: "2h",
    realtime: {
      skipColumns: ["payload", "output"],
    },
  });
}

async function serializeStudentImportJob(
  job: any,
  rows: any[],
): Promise<StudentImportJobRead> {
  return {
    id: job.id,
    status: job.status,
    totalRows: job.totalRows,
    processedRows: job.processedRows,
    createdStudents: job.createdStudents,
    keptMatches: job.keptMatches,
    updatedMatches: job.updatedMatches,
    termSheetsCreated: job.termSheetsCreated,
    skippedRows: job.skippedRows,
    failedRows: job.failedRows,
    errorMessage: job.errorMessage,
    triggerRunId: job.triggerRunId,
    triggerAccessToken: await createStudentImportJobTriggerAccessToken(
      job.triggerRunId,
    ),
    rows: rows.map((row) => ({
      lineNumber: row.lineNumber,
      action: row.action,
      status: jobRowStatusToImportResultStatus(row.status),
      studentId: row.studentId,
      termSheetCreated: row.termSheetCreated,
      reason: row.reason,
    })),
  };
}

async function updateStudentImportJobProgress(
  db: any,
  job: { id: string; totalRows: number },
) {
  const rows = await db.studentImportJobRow.findMany({
    where: {
      jobId: job.id,
      deletedAt: null,
    },
    orderBy: { lineNumber: "asc" },
  });
  const summary = summarizeStudentImportJobRows(rows);
  const status =
    summary.processedRows < job.totalRows
      ? "RUNNING"
      : summary.failedRows > 0
        ? "COMPLETED_WITH_FAILURES"
        : "COMPLETED";
  const updatedJob = await db.studentImportJob.update({
    where: { id: job.id },
    data: {
      status,
      ...summary,
    },
  });

  return { job: updatedJob, rows };
}

export type StartStudentImportJobOptions = {
  enqueue?: boolean;
};

export async function startStudentImportJob(
  ctx: TRPCContext,
  input: ExecuteStudentImport,
  options: StartStudentImportJobOptions = {},
): Promise<StudentImportJobRead> {
  const { db, profile } = ctx;
  await resolveStudentImportClassrooms(ctx, input);
  const rows = input.rows.map((row) => ({
    ...row,
    classroomDepartmentId:
      row.classroomDepartmentId || input.classroomDepartmentId,
  }));

  const job = await (db as any).studentImportJob.create({
    data: {
      schoolProfileId: profile.schoolId!,
      schoolSessionId: profile.sessionId!,
      sessionTermId: profile.termId!,
      createdByUserId: ctx.currentUser?.id ?? null,
      totalRows: rows.length,
      processedRows: 0,
      createdStudents: 0,
      keptMatches: 0,
      updatedMatches: 0,
      termSheetsCreated: 0,
      skippedRows: 0,
      failedRows: 0,
    },
  });

  await (db as any).studentImportJobRow.createMany({
    data: rows.map((row) => ({
      jobId: job.id,
      lineNumber: row.lineNumber,
      action: row.action,
      status: "PENDING",
      payload: row,
      termSheetCreated: false,
    })),
  });

  if (options.enqueue !== false) {
    const run = await tasks.trigger(processStudentImportJobTaskId, {
      jobId: job.id,
    });

    if (run?.id) {
      await (db as any).studentImportJob.update({
        where: { id: job.id },
        data: { triggerRunId: run.id },
      });
    }
  }

  const createdJob = await getStudentImportJob(ctx, { jobId: job.id });

  if (!createdJob) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Created student import job could not be read.",
    });
  }

  return createdJob;
}

export async function getStudentImportJob(
  ctx: TRPCContext,
  input: z.infer<typeof getStudentImportJobSchema> = {},
): Promise<StudentImportJobRead | null> {
  const { db, profile } = ctx;

  if (!profile.schoolId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Active school is required",
    });
  }

  const job = await (db as any).studentImportJob.findFirst({
    where: {
      ...(input?.jobId ? { id: input.jobId } : {}),
      schoolProfileId: profile.schoolId,
      deletedAt: null,
      ...(!input?.jobId && ctx.currentUser?.id
        ? { createdByUserId: ctx.currentUser.id }
        : {}),
      ...(!input?.jobId
        ? {
            status: {
              in: [
                "PENDING",
                "RUNNING",
                "COMPLETED",
                "COMPLETED_WITH_FAILURES",
              ],
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  if (!job) {
    if (!input?.jobId) {
      return null;
    }

    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Student import job was not found.",
    });
  }

  const rows = await (db as any).studentImportJobRow.findMany({
    where: {
      jobId: job.id,
      deletedAt: null,
    },
    orderBy: { lineNumber: "asc" },
  });

  return serializeStudentImportJob(job, rows);
}

export async function processStudentImportJob(
  db: any,
  jobId: string,
): Promise<StudentImportJobRead> {
  const job = await db.studentImportJob.findFirst({
    where: {
      id: jobId,
      deletedAt: null,
    },
  });

  if (!job) {
    throw new Error(`Student import job ${jobId} was not found.`);
  }

  await db.studentImportJob.update({
    where: { id: job.id },
    data: { status: "RUNNING", errorMessage: null },
  });

  const pendingRows = await db.studentImportJobRow.findMany({
    where: {
      jobId: job.id,
      status: { in: ["PENDING", "RUNNING"] },
      deletedAt: null,
    },
    orderBy: { lineNumber: "asc" },
  });

  const processCtx = {
    db,
    profile: {
      schoolId: job.schoolProfileId,
      sessionId: job.schoolSessionId,
      termId: job.sessionTermId,
    },
  } as TRPCContext;

  for (
    let index = 0;
    index < pendingRows.length;
    index += STUDENT_IMPORT_JOB_CHUNK_SIZE
  ) {
    const chunk = pendingRows.slice(
      index,
      index + STUDENT_IMPORT_JOB_CHUNK_SIZE,
    );

    for (const jobRow of chunk) {
      try {
        await db.studentImportJobRow.update({
          where: { id: jobRow.id },
          data: { status: "RUNNING" },
        });

        const result = await executeStudentImport(processCtx, {
          rows: [jobRow.payload as ExecuteStudentImport["rows"][number]],
        });
        const rowResult = result.rows[0];

        if (!rowResult) {
          throw new Error("Import row did not return a result.");
        }

        await db.studentImportJobRow.update({
          where: { id: jobRow.id },
          data: {
            status: importResultStatusToJobRowStatus(rowResult.status),
            studentId: rowResult.studentId ?? null,
            termSheetCreated: Boolean(rowResult.termSheetCreated),
            reason: rowResult.reason ?? null,
            completedAt: new Date(),
          },
        });
      } catch (error) {
        await db.studentImportJobRow.update({
          where: { id: jobRow.id },
          data: {
            status: "FAILED",
            reason: error instanceof Error ? error.message : "Unknown error",
            completedAt: new Date(),
          },
        });
      }
    }

    await updateStudentImportJobProgress(db, job);
  }

  const { job: updatedJob, rows: allRows } =
    await updateStudentImportJobProgress(db, job);

  return serializeStudentImportJob(updatedJob, allRows);
}

async function createTermSheetIfMissing(
  tx: any,
  studentId: string,
  profile: { schoolId?: string; sessionId?: string; termId?: string },
  classroomDepartmentId: string,
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
    if (
      existingCurrentTermForm.classroomDepartmentId === classroomDepartmentId
    ) {
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
