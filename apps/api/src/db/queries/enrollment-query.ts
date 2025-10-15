import { composeQueryData } from "@api/query-response";
import type { TRPCContext } from "@api/trpc/init";
import type { EnrollmentQuery } from "@api/trpc/schemas/schemas";
import type { PageFilterData } from "@api/type";
import { composeQuery } from "@api/utils";
import type { Prisma } from "@school-clerk/db";

import { z } from "zod";

export async function enrollmentsIndex(
  ctx: TRPCContext,
  input: EnrollmentQuery
) {
  const model = ctx.db.students;
  if (!input.currentSessionId && !input.currentTermId) {
    input.currentSessionId = ctx.profile?.sessionId;
    input.currentTermId = ctx.profile?.termId;
  }
  const _where = whereEnrollments(input);
  // console.log({ _where, input });
  const qd = await composeQueryData(input, _where, model);
  const { response, searchMeta, where } = qd;
  const termFormWhere = whereTermForm(input);
  const list = await model.findMany({
    where,
    ...searchMeta,
    select: {
      id: true,
      name: true,
      otherName: true,
      surname: true,
      termForms: {
        where: !termFormWhere ? undefined : termFormWhere,
        distinct: ["schoolSessionId"],
        select: {
          id: true,
          classroomDepartment: {
            select: {
              classRoom: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          sessionTerm: {
            select: {
              title: true,
              id: true,
              session: {
                select: {
                  title: true,
                  id: true,
                },
              },
            },
          },
        },
      },
    },
  });
  return await response(
    list.map((item) => {
      const fullName = studentDisplayName(item);
      const terms = item.termForms.map((tf) => {
        return {
          title: `${tf.sessionTerm?.session?.title} ${tf.sessionTerm?.title}`,
          id: tf.id,
          classRoom: tf.classroomDepartment?.classRoom?.name,
          sessionId: tf.sessionTerm?.session?.id,
          termId: tf.sessionTerm?.id,
        };
      });
      const currentTerm = terms.find((t) => t.termId == input.currentTermId);
      return {
        id: item.id,
        fullName,
        termHistory: terms, //.filter((t) => t.termId != input.currentTermId),
        currentTerm,
      };
    })
  );
}
export function studentDisplayName({ name, surname, otherName }) {
  return [name, surname, otherName].filter(Boolean).join(" ");
}
function whereTermForm(input: EnrollmentQuery) {
  const where: Prisma.StudentTermFormWhereInput[] = [];
  const {
    currentClassDepartmentId,
    previousClassDepartmentId,
    currentTermId,
    currentSessionId,
    previousTermId,
    previousSessionId,
  } = input;
  if (previousTermId)
    where.push({
      sessionTermId: previousTermId,
      classroomDepartmentId: previousClassDepartmentId || undefined,
    });
  else if (previousSessionId)
    where.push({
      schoolSessionId: previousSessionId,
      classroomDepartmentId: previousClassDepartmentId || undefined,
    });

  return composeQuery(where);
}
function whereEnrollments(input: EnrollmentQuery) {
  const where: Prisma.StudentsWhereInput[] = [];
  Object.entries(input)
    // .filter(([k, v]) => !!v)
    .map(([key, value]) => {
      switch (key as keyof EnrollmentQuery) {
        case "previousSessionId":
          if (value)
            where.push({
              sessionForms: {
                some: {
                  schoolSessionId: value,
                },
              },
            });

          break;
        case "previousTermId":
          if (value)
            where.push({
              termForms: {
                some: {
                  id: value,
                },
              },
            });
          break;
        case "currentSessionId":
          if (value)
            where.push({
              sessionForms: {
                none: {
                  schoolSessionId: value,
                },
              },
            });
          break;
        case "currentTermId":
          if (value && !input.currentSessionId)
            where.push({
              termForms: {
                none: {
                  id: value,
                },
              },
            });
          break;
      }
    });
  return composeQuery(where);
}

export async function getEnrollmentQueryParams(ctx: TRPCContext) {
  // session list
  const sessionList = await ctx.db.schoolSession.findMany({
    where: {
      id: {
        not: ctx.profile?.termId,
      },
      schoolId: ctx.profile?.schoolId,
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
    },
  });
  return [
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
            label: t.title,
            subLabel: s.title,
            value: t.id,
          }))
        )
        .flat(),
      type: "checkbox",
      value: "sessionId",
    },
  ] satisfies PageFilterData[];
}

/*
entrollStudentToTerm: publicProcedure
      .input(entrollStudentToTermchema)
      .query(async (props) => {
        return entrollStudentToTerm(props.ctx.db, props.input);
      }),
*/
export const entrollStudentToTermSchema = z.object({
  studentId: z.string(),
  // termId: z.string(),
  classroomDepartmentId: z.string().optional().nullable(),
  // classroomId: z.string().optional().nullable(),
  studentSessionFormId: z.string().optional().nullable(),
  schoolSessionId: z.string(),
  sessionTermId: z.string(),
});
export type EntrollStudentToTerm = z.infer<typeof entrollStudentToTermSchema>;

export async function entrollStudentToTerm(
  { db, profile }: TRPCContext,
  data: EntrollStudentToTerm
) {
  return db.$transaction(async (tx) => {
    // return { profile };
    if (!data.studentSessionFormId) {
      const ssf = await tx.studentSessionForm.create({
        data: {
          schoolProfileId: profile.schoolId,
          schoolSessionId: data.schoolSessionId,
          studentId: data.studentId,
          classroomDepartmentId: data.classroomDepartmentId,
        },
      });
      data.studentSessionFormId = ssf.id;
    }
    await tx.studentTermForm.create({
      data: {
        classroomDepartmentId: data.classroomDepartmentId,
        schoolSessionId: data.schoolSessionId,
        studentId: data.studentId,
        sessionTermId: data.sessionTermId,
        schoolProfileId: profile.schoolId,
        studentSessionFormId: data.studentSessionFormId!,
      },
    });
    // throw new Error("CREATED DEBUG!");
  });
}
