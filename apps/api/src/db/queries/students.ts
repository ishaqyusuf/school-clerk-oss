import { composeQueryData } from "@api/query-response";
import type { TRPCContext } from "@api/trpc/init";
import type { GetStudentsSchema } from "@api/trpc/schemas/schemas";
import type { PageFilterData } from "@api/type";
import { composeQuery, txContext } from "@api/utils";
import type { Prisma } from "@school-clerk/db";
import { studentDisplayName } from "./enrollment-query";
import { STUDENT_PAGE_STATUS_FILTERS } from "@school-clerk/utils/constants";
import { z } from "zod";

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
      value: "sessionId",
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
  dob: z.date().nullable(),
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
  await updateStudentTermFormStudentId(ctx);

  return student;
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

export async function studentsRecentRecord(
  ctx: TRPCContext,
  query: StudentsRecentRecordSchema
) {
  const { db, profile } = ctx;
  const sessionTermId = profile.termId;
  const students = await db.students.findMany({
    where: {
      schoolProfileId: profile.schoolId,
    },
    select: {
      name: true,
      otherName: true,
      surname: true,
      termForms: {
        // where: {
        //   OR: [
        //     {
        //       sessionTermId,
        //     },
        //     {
        //       sessionTermId: {
        //         not: null,
        //       },
        //     },
        //   ],
        // },
        take: 1,
        select: {
          sessionTermId: true,
        },
      },
    },
  });
}
