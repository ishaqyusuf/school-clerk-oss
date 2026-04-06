import { composeQuery, composeQueryData } from "@api/query-response";
import type { TRPCContext } from "@api/trpc/init";
import {
  paginationSchema,
  type ClassroomQuery,
} from "@api/trpc/schemas/schemas";
import type { Prisma } from "@school-clerk/db";
import { classroomDisplayName } from "@school-clerk/utils";
import { z } from "zod";

export async function getClassrooms(
  { db, profile }: TRPCContext,
  params: ClassroomQuery
) {
  const effectiveTermId = params?.sessionTermId || profile?.termId;
  const classRoomDepartments = await db.classRoomDepartment.findMany({
    where: {
      id: !params?.departmentId ? undefined : params.departmentId,
      classRoom: {
        schoolSessionId: params.schoolSessionId || undefined,
        name: params.className ? params.className : undefined,
        session: effectiveTermId
          ? {
              terms: {
                some: {
                  id: effectiveTermId,
                },
              },
            }
          : undefined,
      },
    },
    select: {
      id: true,
      departmentName: true,
      departmentLevel: true,
      _count: {
        select: {
          studentSessionForms: {
            where: {
              student: {
                deletedAt: null,
              },
            },
          },
        },
      },
      classRoom: {
        select: {
          session: {
            select: {
              terms: {
                where: {
                  id: effectiveTermId,
                },
                take: 1,
                select: {
                  id: true,
                  title: true,
                },
              },
              title: true,
              id: true,
            },
          },
          name: true,
          classLevel: true,
          id: true,
        },
      },
    },
    orderBy: [
      {
        classRoom: {
          classLevel: "asc",
        },
      },
      {
        departmentLevel: "asc",
      },
      {
        departmentName: "asc",
      },
    ],
  });
  return {
    data: classRoomDepartments.map(({ ...a }) => {
      const displayName = classroomDisplayName({
        className: a.classRoom?.name,
        departmentName: a.departmentName,
      });
      return {
        ...a,
        displayName,
        classRoom: {
          ...a?.classRoom,
          session: {
            term: a?.classRoom?.session?.terms?.[0],
            ...(a?.classRoom?.session || {}),
          },
        },
      };
    }),
    meta: {} as any,
  };
}
/*
getClassroomOverview: publicProcedure
      .input(getClassroomOverviewchema)
      .query(async (props) => {
        return getClassroomOverview(props.ctx.db, props.input);
      }),
*/
export const getClassroomOverviewSchema = z.object({
  departmentId: z.string(), //.optional().nullable(),
});
export type GetClassroomOverview = z.infer<typeof getClassroomOverviewSchema>;

export async function getClassroomOverview(
  ctx: TRPCContext,
  query: GetClassroomOverview
) {
  const c = await getClassrooms(ctx, {
    departmentId: query.departmentId,
  });
  return {
    ...c?.data?.[0]!,
  };
}
export const getClassroomsSchema = z
  .object({
    departmentId: z.string().optional().nullable(),
    sessionId: z.string().optional().nullable(),
  })
  .merge(paginationSchema);
export type GetClassroomsSchema = z.infer<typeof getClassroomsSchema>;

export async function getClassroomDepartments(
  ctx: TRPCContext,
  query: GetClassroomsSchema
) {
  const { db } = ctx;
  // const query = {};
  if (!query.sessionId) query.sessionId = ctx.profile.sessionId;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereClassrooms(query),
    db.classRoomDepartment
  );

  const data = await db.classRoomDepartment.findMany({
    where,
    ...searchMeta,
    select: {
      id: true,
      departmentName: true,
      departmentLevel: true,
      _count: {
        select: {
          studentSessionForms: {
            where: {
              student: {
                deletedAt: null,
              },
            },
          },
        },
      },
      classRoom: {
        select: {
          session: {
            select: {
              title: true,
              id: true,
            },
          },
          classLevel: true,
          name: true,
          id: true,
        },
      },
    },
    orderBy: [{ departmentLevel: "asc" }, { departmentName: "asc" }],
  });

  return await response(
    data.map((a) => {
      const displayName = classroomDisplayName({
        className: a.classRoom?.name,
        departmentName: a.departmentName,
      });
      return {
        ...a,
        displayName,
      };
    })
  );
}
function whereClassrooms(query: GetClassroomsSchema) {
  const where: Prisma.ClassRoomDepartmentWhereInput[] = [];
  // query.departmentId = ctx.profile.
  for (const [k, v] of Object.entries(query)) {
    if (!v) continue;
    switch (k as keyof GetClassroomsSchema) {
      case "q":
        break;
      case "sessionId":
        where.push({
          classRoom: {
            schoolSessionId: v as any,
          },
        });
        break;
    }
  }
  return composeQuery(where);
}
