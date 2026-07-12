import { TRPCError } from "@trpc/server";
import { resolveStaffAcademicAccess } from "@school-clerk/db";
import type { TRPCContext } from "../trpc/init";
import { tryGetCurrentUserContext } from "./notifications";

async function getTeacherStaffProfile(ctx: TRPCContext) {
  const currentUser = await tryGetCurrentUserContext(ctx);

  if (currentUser?.user.role !== "Teacher") {
    return null;
  }

  if (!ctx.profile.schoolId || !currentUser.user.email) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Teacher access could not be resolved for this school term.",
    });
  }

  const staffProfile = await ctx.db.staffProfile.findFirst({
    where: {
      deletedAt: null,
      schoolProfileId: ctx.profile.schoolId,
      email: {
        equals: currentUser.user.email,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
    },
  });

  if (!staffProfile) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your teacher profile is not linked to this account.",
    });
  }

  return staffProfile;
}

export async function getTeacherAcademicAccess(
  ctx: TRPCContext,
  sessionTermId?: string | null,
) {
  const staffProfile = await getTeacherStaffProfile(ctx);
  if (!staffProfile) return null;

  const schoolProfileId = ctx.profile.schoolId;
  const effectiveTermId = sessionTermId ?? ctx.profile.termId;

  if (!schoolProfileId || !effectiveTermId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Teacher access could not be resolved for this school term.",
    });
  }

  const term =
    effectiveTermId === ctx.profile.termId && ctx.profile.sessionId
      ? { sessionId: ctx.profile.sessionId }
      : await ctx.db.sessionTerm.findFirst({
          where: {
            id: effectiveTermId,
            deletedAt: null,
            schoolId: schoolProfileId,
          },
          select: {
            sessionId: true,
          },
        });

  if (!term?.sessionId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Teacher access could not be resolved for this school term.",
    });
  }

  return resolveStaffAcademicAccess({
    db: ctx.db,
    staffProfileId: staffProfile.id,
    schoolProfileId,
    schoolSessionId: term.sessionId,
    sessionTermId: effectiveTermId,
  });
}

export async function assertTeacherCanAccessClassroomDepartment(
  ctx: TRPCContext,
  classRoomDepartmentId?: string | null,
  sessionTermId = ctx.profile.termId,
) {
  if (!classRoomDepartmentId) return;

  if (!sessionTermId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Teacher access could not be resolved for this school term.",
    });
  }

  const access = await getTeacherAcademicAccess(ctx, sessionTermId);
  if (!access) return;

  if (!access.classRoomDepartmentIds.includes(classRoomDepartmentId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This classroom is not assigned to your teacher profile.",
    });
  }
}

export async function assertTeacherCanAccessDepartmentSubject(
  ctx: TRPCContext,
  departmentSubjectId?: string | null,
  sessionTermId = ctx.profile.termId,
) {
  if (!departmentSubjectId) return;

  const departmentSubject = await ctx.db.departmentSubject.findFirst({
    where: {
      id: departmentSubjectId,
      deletedAt: null,
      ...(sessionTermId ? { sessionTermId } : {}),
      classRoomDepartment: {
        deletedAt: null,
        schoolProfileId: ctx.profile.schoolId,
      },
    },
    select: {
      classRoomDepartmentId: true,
      sessionTermId: true,
    },
  });

  if (!departmentSubject?.classRoomDepartmentId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This subject is not assigned to your teacher profile.",
    });
  }

  const effectiveTermId = sessionTermId ?? departmentSubject.sessionTermId;
  const access = await getTeacherAcademicAccess(ctx, effectiveTermId);
  if (!access) return;

  if (!access.departmentSubjectIds.includes(departmentSubjectId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This subject is not assigned to your teacher profile.",
    });
  }
}

export async function assertTeacherCanAccessAssessment(
  ctx: TRPCContext,
  assessmentId?: number | null,
) {
  if (!assessmentId) return;

  const assessment = await ctx.db.classroomSubjectAssessment.findFirst({
    where: {
      id: assessmentId,
      deletedAt: null,
    },
    select: {
      departmentSubjectId: true,
      departmentSubject: {
        select: {
          sessionTermId: true,
        },
      },
    },
  });

  await assertTeacherCanAccessDepartmentSubject(
    ctx,
    assessment?.departmentSubjectId,
    assessment?.departmentSubject?.sessionTermId,
  );
}
