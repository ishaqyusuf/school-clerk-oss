import type { TRPCContext } from "@api/trpc/init";
import type {
  CreateAcademicSession,
  GetStudentTermListSchema,
} from "@api/trpc/schemas/schemas";

export async function getStudentTermsList(
  ctx: TRPCContext,
  query: GetStudentTermListSchema
) {
  const school = await ctx.db.schoolProfile.findFirstOrThrow({
    where: {
      students: {
        some: {
          id: query.studentId,
        },
      },
    },
  });
  // list of school terms
  const terms = await ctx.db.sessionTerm.findMany({
    where: {
      schoolId: school.id,
    },
    orderBy: {
      endDate: "desc",
    },
    select: {
      title: true,
      id: true,
      startDate: true,
      endDate: true,
      session: {
        select: {
          title: true,
          id: true,
        },
      },

      termForms: {
        where: {
          student: {
            id: query.studentId,
          },
          deletedAt: null,
        },
        select: {
          id: true,
          sessionForm: {
            select: {
              id: true,
            },
          },
          classroomDepartment: {
            select: {
              id: true,
              classRoomsId: true,
              departmentName: true,
              classRoom: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });
  const termList = terms.map((term) => {
    const termForm = term?.termForms?.[0];
    return {
      term: `${term.title} ${term.session?.title}`,
      termId: term?.id,
      termSessionId: term?.session?.id,

      //   description: [term.startDate, term.endDate].map(d => ())
      studentTermId: termForm?.id || null,
      departmentName: termForm?.classroomDepartment?.departmentName || null,
      departmentId: termForm?.classroomDepartment?.id || null,
      classroomId: termForm?.classroomDepartment?.classRoomsId || null,
      studentSessionId: termForm?.sessionForm?.id || null,
    };
  });
  const sessionMap = new Map<string, (typeof termList)[0][]>();
  for (const tl of termList) {
    if (!sessionMap.has(tl.termSessionId!))
      sessionMap.set(tl.termSessionId!, []);
    sessionMap.get(tl.termSessionId!)!.push(tl);
  }

  return termList.map((tl) => {
    if (!tl.studentSessionId || !tl.departmentId || !tl.classroomId) {
      const candidates = sessionMap.get(tl.termSessionId!) || [];
      const fallback = candidates.find((c) => c.studentSessionId);
      if (fallback) {
        tl.studentSessionId ||= fallback.studentSessionId;
        tl.classroomId ||= fallback.classroomId;
        tl.departmentId ||= fallback.departmentId;
        tl.departmentName ||= fallback.departmentName;
      }
    }
    return tl;
  });
  // return termList.map((tl) => {
  //   const matchSession = termList.find(
  //     (_) => _.termSessionId === tl.termSessionId && !!tl?.studentSessionId
  //   );
  //   if (!tl.studentSessionId)
  //     tl.studentSessionId = matchSession?.studentSessionId!;
  //   if (!tl.classroomId) tl.classroomId = matchSession?.classroomId!;
  //   if (!tl.departmentId) tl.departmentId = matchSession?.departmentId!;
  //   return tl;
  // });
}
export async function createAcademicSession(
  ctx: TRPCContext,
  data: CreateAcademicSession
) {
  const { sessionId, terms, title } = data;
  const { db } = ctx;
  const resp = await db.$transaction(async (tx) => {
    sessionId
      ? await tx.schoolSession.update({
          where: {
            id: sessionId,
          },
          data: {
            terms: {
              createMany: terms?.length
                ? {
                    data: data.terms!?.map((d) => ({
                      schoolId: ctx.profile?.schoolId,
                      title: d.title,
                      startDate: d.startDate,
                      endDate: d.endDate,
                    })),
                  }
                : undefined,
            },
          },
        })
      : await tx.schoolSession.create({
          data: {
            title: title!,
            school: {
              connect: {
                id: ctx.profile.schoolId,
              },
            },
            terms: {
              createMany: terms?.length
                ? {
                    data: data.terms!?.map((d) => ({
                      schoolId: ctx.profile?.schoolId,
                      title: d.title,
                      startDate: d.startDate,
                      endDate: d.endDate,
                    })),
                  }
                : undefined,
            },
          },
        });
  });
}
