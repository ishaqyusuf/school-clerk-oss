import type { TRPCContext } from "@api/trpc/init";
import type {
  UpdateAcademicSessionMetadata,
  UpdateAcademicTermMetadata,
} from "@api/trpc/schemas/academic-metadata";
import type {
  CreateAcademicSession,
  GetStudentTermListSchema,
} from "@api/trpc/schemas/schemas";
import { readStudentAcademicOverview } from "./student-academic-read";
import { TRPCError } from "@trpc/server";
import { requireAcademicAdmin } from "./academic-access";

export async function getStudentTermsList(
  ctx: TRPCContext,
  query: GetStudentTermListSchema,
) {
  return (await readStudentAcademicOverview(ctx, query)).studentTerms;
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

export async function updateAcademicSessionMetadata(
  ctx: TRPCContext,
  input: UpdateAcademicSessionMetadata,
) {
  const { schoolProfileId } = await requireAcademicAdmin(ctx);
  const session = await ctx.db.schoolSession.findFirst({
    where: {
      id: input.sessionId,
      schoolId: schoolProfileId,
      deletedAt: null,
    },
    select: { id: true, title: true },
  });
  if (!session) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Academic session was not found.",
    });
  }
  if (input.title.toLocaleLowerCase() !== session.title.toLocaleLowerCase()) {
    const duplicate = await ctx.db.schoolSession.findFirst({
      where: {
        id: { not: session.id },
        schoolId: schoolProfileId,
        deletedAt: null,
        title: { equals: input.title, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "An academic session with this name already exists.",
      });
    }
  }

  return ctx.db.schoolSession.update({
    where: { id: session.id },
    data: {
      title: input.title,
      startDate: input.startDate,
      endDate: input.endDate,
    },
    select: {
      id: true,
      title: true,
      startDate: true,
      endDate: true,
    },
  });
}

export async function updateAcademicTermMetadata(
  ctx: TRPCContext,
  input: UpdateAcademicTermMetadata,
) {
  const { schoolProfileId, activeSessionTermId } =
    await requireAcademicAdmin(ctx);
  const term = await ctx.db.sessionTerm.findFirst({
    where: {
      id: input.termId,
      schoolId: schoolProfileId,
      deletedAt: null,
    },
    select: { id: true, lifecycleStatus: true, sessionId: true, title: true },
  });
  if (!term) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Academic term was not found.",
    });
  }
  if (term.lifecycleStatus === "CLOSED") {
    throw new TRPCError({
      code: "CONFLICT",
      message: "A closed term cannot be edited.",
    });
  }
  const isActiveTerm =
    term.lifecycleStatus === "ACTIVE" || term.id === activeSessionTermId;
  const title = input.title?.trim();
  if (title && title.toLocaleLowerCase() !== term.title.toLocaleLowerCase()) {
    const duplicate = await ctx.db.sessionTerm.findFirst({
      where: {
        id: { not: term.id },
        schoolId: schoolProfileId,
        sessionId: term.sessionId,
        deletedAt: null,
        title: { equals: title, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "A term with this title already exists in this session.",
      });
    }
  }
  return ctx.db.sessionTerm.update({
    where: { id: term.id },
    data:
      isActiveTerm
        ? { title }
        : {
            title,
            startDate: input.startDate,
            endDate: input.endDate,
            ...(input.note === undefined
              ? {}
              : { note: input.note || null }),
          },
    select: {
      id: true,
      title: true,
      startDate: true,
      endDate: true,
      note: true,
      lifecycleStatus: true,
    },
  });
}
