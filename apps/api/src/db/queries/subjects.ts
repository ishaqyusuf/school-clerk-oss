import { composeQueryData } from "@api/query-response";
import type { TRPCContext } from "@api/trpc/init";
import type {
  GetAllSubjects,
  GetClassroomSubjects,
  GetSubjectsSchema,
} from "@api/trpc/schemas/students";
import { composeQuery } from "@api/utils";
import { Prisma, type Database } from "@school-clerk/db";
import { z } from "zod";
import { getClassroomDepartments } from "./classroom";

export async function getSubjects(ctx: TRPCContext, query: GetSubjectsSchema) {
  const { db } = ctx;
  const model = db.departmentSubject;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereSubjects(query),
    model
  );
  const data = await model.findMany({
    where,
    ...searchMeta,
    select: {
      id: true,
      subject: {
        select: { id: true, title: true },
      },
      classRoomDepartment: {
        select: {
          departmentName: true,
          classRoom: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
  return await response(
    data.map((d) => ({
      ...d,
    }))
  );
}
function whereSubjects(query: GetSubjectsSchema) {
  const where: Prisma.DepartmentSubjectWhereInput[] = [];
  if (query.q) {
    where.push({});
  }
  if (query.departmentId) {
    where.push({
      classRoomDepartmentId: query.departmentId,
    });
  }
  return composeQuery(where);
}
/*
subjectOverview: publicProcedure
      .input(subjectOverviewSchema)
      .input|mutation(async (props) => {
        return subjectOverview(props.ctx, props.input);
      }),
*/
export const subjectOverviewSchema = z.object({
  departmentSubjectId: z.string(),
});
export type SubjectOverviewSchema = z.infer<typeof subjectOverviewSchema>;

export async function overview(ctx: TRPCContext, query: SubjectOverviewSchema) {
  const { db } = ctx;
  const subject = await db.departmentSubject.findUnique({
    where: {
      id: query.departmentSubjectId,
    },
    select: {
      id: true,
      sessionTermId: true,
      subject: {
        select: {
          title: true,
        },
      },
      assessments: {
        select: {
          id: true,
          index: true,
          createdAt: true,
          title: true,
          obtainable: true,
          percentageObtainable: true,
          _count: {
            select: {
              assessmentResults: {
                where: {
                  deletedAt: null,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  return { subject };
}
export async function getAllSubjects(
  { db, profile }: TRPCContext,
  params: GetAllSubjects
) {
  const subjects = await db.subject.findMany({
    where: {
      schoolProfileId: profile.schoolId,
    },
    select: {
      id: true,
      title: true,
      schoolProfileId: true,
    },
  });
  return subjects;
}
export async function getClassroomSubjects(
  db: Database,
  params: GetClassroomSubjects
) {
  const subjects = await db.departmentSubject.findMany({
    where: {
      classRoomDepartmentId: params?.departmentId,
    },
    select: {
      id: true,
      subject: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });
  return subjects;
}
export async function getSubjectByName(ctx: TRPCContext, name: string) {
  let subject = await ctx.db.subject.findFirst({
    where: {
      schoolProfileId: ctx?.profile?.schoolId,
      title: name,
    },
  });
  if (!subject)
    return await ctx.db.subject.create({
      data: {
        title: name,
        schoolProfileId: ctx?.profile?.schoolId,
      },
    });
  return subject;
}
export async function getClassroomSubjectByName(
  ctx: TRPCContext,
  name: string,
  classDepartmentId: string
) {
  const subject = await getSubjectByName(ctx, name);
  let classroomSubject = await ctx.db.departmentSubject.findFirst({
    where: {
      classRoomDepartmentId: classDepartmentId,
      subjectId: subject.id,
      sessionTermId: ctx?.profile.termId,
    },
    include: { subject: true },
  });
  if (!classroomSubject)
    return await ctx.db.departmentSubject.create({
      data: {
        classRoomDepartmentId: classDepartmentId,
        subjectId: subject.id,
        sessionTermId: ctx?.profile.termId,
      },
      include: {
        subject: true,
      },
    });
  return classroomSubject;
}
export const saveSubjectSchema = z.object({
  title: z.string(),
  description: z.string().optional().nullable(),
  subjectId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  departmentSubjectId: z.string().optional().nullable(),
  sessionTermId: z.string().optional().nullable(),
});
export type SaveSubjectSchema = z.infer<typeof saveSubjectSchema>;

export async function saveSubject(ctx: TRPCContext, data: SaveSubjectSchema) {
  const { db, profile } = ctx;
  if (!data.sessionTermId) data.sessionTermId = profile.termId;
  const subject = await ctx.db.subject.upsert({
    where: {
      title_schoolProfileId: {
        title: data.title,
        schoolProfileId: profile.schoolId,
      },
    },
    create: {
      title: data.title,
      schoolProfileId: profile.schoolId,
      departmentSubjects: !data.departmentId
        ? undefined
        : {
            connect: data.departmentSubjectId
              ? {
                  id: data.departmentSubjectId,
                }
              : undefined,
            create: !data.departmentSubjectId
              ? {
                  classRoomDepartmentId: data.departmentId,
                  sessionTermId: data.sessionTermId,
                }
              : undefined,
          },
    },
    update: {
      title: data.title,
      schoolProfileId: profile.schoolId,
      departmentSubjects: !data.departmentId
        ? undefined
        : {
            connect: data.departmentSubjectId
              ? {
                  id: data.departmentSubjectId,
                }
              : undefined,
            create: !data.departmentSubjectId
              ? {
                  classRoomDepartmentId: data.departmentId,
                  sessionTermId: data.sessionTermId,
                }
              : undefined,
          },
    },
    include: {
      departmentSubjects: {
        where: {
          classRoomDepartmentId: data.departmentId,
        },
      },
    },
  });
  return subject;
  if (!data.subjectId)
    await db.subject.create({
      data: {
        schoolProfileId: profile.schoolId,
        title: data.title,
        departmentSubjects:
          data.departmentSubjectId || !data.departmentId
            ? undefined
            : {
                create: {
                  classRoomDepartmentId: data.departmentId,
                  sessionTermId: data.sessionTermId,
                },
              },
      },
    });
  else
    await db.subject.update({
      where: {
        id: data.subjectId!,
      },
      data: {
        title: data.title,
        departmentSubjects: !data.departmentId
          ? undefined
          : {
              create: {
                classRoomDepartmentId: data.departmentId,
                sessionTermId: data.sessionTermId,
              },
            },
      },
    });
}

/*
formData: publicProcedure
      .input(formDataSchema)
      .mutation(async (props) => {
        return formData(props.ctx, props.input);
      }),
*/
export const formDataSchema = z.object({
  id: z.string().optional().nullable(),
});
export type FormDataSchema = z.infer<typeof formDataSchema>;

export async function formData(ctx: TRPCContext, data: FormDataSchema) {
  const { db, profile } = ctx;
  const departments = await getClassroomDepartments(ctx, {
    sessionId: profile.sessionId,
  });
  return {
    departments: departments.data,
  };
}
