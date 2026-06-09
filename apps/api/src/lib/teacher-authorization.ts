import { TRPCError } from "@trpc/server";
import type { TRPCContext } from "../trpc/init";
import { tryGetCurrentUserContext } from "./notifications";

async function getTeacherStaffProfile(ctx: TRPCContext) {
  const currentUser = await tryGetCurrentUserContext(ctx);

  if (currentUser?.user.role !== "Teacher") {
    return null;
  }

  if (!ctx.profile.schoolId || !ctx.profile.termId || !currentUser.user.email) {
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

export async function assertTeacherCanAccessClassroomDepartment(
  ctx: TRPCContext,
  classRoomDepartmentId?: string | null,
) {
  if (!classRoomDepartmentId) return;

  const staffProfile = await getTeacherStaffProfile(ctx);
  if (!staffProfile) return;

  const assignment = await ctx.db.staffClassroomDepartmentTermProfiles.findFirst({
    where: {
      deletedAt: null,
      classRoomDepartmentId,
      staffTermProfile: {
        deletedAt: null,
        staffProfileId: staffProfile.id,
        sessionTermId: ctx.profile.termId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!assignment) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This classroom is not assigned to your teacher profile.",
    });
  }
}

export async function assertTeacherCanAccessDepartmentSubject(
  ctx: TRPCContext,
  departmentSubjectId?: string | null,
) {
  if (!departmentSubjectId) return;

  const staffProfile = await getTeacherStaffProfile(ctx);
  if (!staffProfile) return;

  const assignment = await ctx.db.staffSubject.findFirst({
    where: {
      deletedAt: null,
      staffProfilesId: staffProfile.id,
      departmentSubjectId,
      departmentSubject: {
        deletedAt: null,
        sessionTermId: ctx.profile.termId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!assignment) {
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
    },
  });

  await assertTeacherCanAccessDepartmentSubject(
    ctx,
    assessment?.departmentSubjectId,
  );
}
