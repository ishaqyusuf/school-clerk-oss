import type { TRPCContext } from "@api/trpc/init";
import type {
  CreateAcademicSession,
  GetStudentTermListSchema,
} from "@api/trpc/schemas/schemas";
import { classroomDisplayName } from "@school-clerk/utils";
import { TRPCError } from "@trpc/server";
import { requireAcademicAdmin } from "./academic-term-setup";

export async function getStudentTermsList(
  ctx: TRPCContext,
  query: GetStudentTermListSchema,
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
    const className = termForm?.classroomDepartment?.classRoom?.name ?? null;
    const departmentName =
      termForm?.classroomDepartment?.departmentName ?? null;
    return {
      term: `${term.title} ${term.session?.title}`,
      termId: term?.id,
      termSessionId: term?.session?.id,

      //   description: [term.startDate, term.endDate].map(d => ())
      studentTermId: termForm?.id || null,
      departmentName,
      className,
      classDisplayName:
        classroomDisplayName({
          className,
          departmentName,
        }) || null,
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
        tl.className ||= fallback.className;
        tl.classDisplayName ||= fallback.classDisplayName;
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
  data: CreateAcademicSession,
) {
  const { schoolProfileId } = await requireAcademicAdmin(ctx);
  const { endDate, sessionId, startDate, terms, title } = data;
  const { db } = ctx;
  const sessionTitle = title?.trim();

  return db.$transaction(async (tx) => {
    let session: { id: string; title: string };

    if (sessionId) {
      const existingSession = await tx.schoolSession.findFirst({
        where: {
          id: sessionId,
          schoolId: schoolProfileId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!existingSession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Academic session was not found.",
        });
      }
      session = await tx.schoolSession.update({
        where: { id: existingSession.id },
        data: {
          startDate,
          endDate,
        },
        select: { id: true, title: true },
      });
    } else {
      const existingSession = await tx.schoolSession.findFirst({
        where: {
          schoolId: schoolProfileId,
          deletedAt: null,
          title: {
            equals: sessionTitle,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          title: true,
          terms: {
            where: { deletedAt: null },
            orderBy: [
              { startDate: { sort: "asc", nulls: "last" } },
              { createdAt: "asc" },
            ],
            select: { id: true, title: true },
          },
        },
      });

      if (existingSession) {
        return {
          sessionId: existingSession.id,
          sessionTitle: existingSession.title,
          terms: existingSession.terms,
          alreadyExists: true,
        };
      }

      try {
        session = await tx.schoolSession.create({
          data: {
            title: sessionTitle!,
            startDate,
            endDate,
            school: { connect: { id: schoolProfileId } },
          },
          select: { id: true, title: true },
        });
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002"
        ) {
          throw new Error(
            "An academic session with this title already exists.",
          );
        }

        throw error;
      }
    }

    let createdTerms: { id: string; title: string }[] = [];
    if (terms?.length) {
      for (const term of terms) {
        createdTerms.push(
          await tx.sessionTerm.create({
            data: {
              schoolId: schoolProfileId,
              sessionId: session.id,
              title: term.title,
              startDate: term.startDate,
              endDate: term.endDate,
              lifecycleStatus: "DRAFT",
            },
            select: { id: true, title: true },
          }),
        );
      }
    }

    return {
      sessionId: session.id,
      sessionTitle: session.title,
      terms: createdTerms,
    };
  });
}
