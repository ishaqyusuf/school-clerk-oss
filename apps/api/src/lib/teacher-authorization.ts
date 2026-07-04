import { TRPCError } from "@trpc/server";
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

export async function assertTeacherCanAccessClassroomDepartment(
  ctx: TRPCContext,
  classRoomDepartmentId?: string | null,
  sessionTermId = ctx.profile.termId,
) {
  if (!classRoomDepartmentId) return;

  const staffProfile = await getTeacherStaffProfile(ctx);
  if (!staffProfile) return;

  if (!sessionTermId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Teacher access could not be resolved for this school term.",
    });
  }

  const assignment = await ctx.db.staffClassroomDepartmentTermProfiles.findFirst({
    where: {
      deletedAt: null,
      classRoomDepartmentId,
      staffTermProfile: {
        deletedAt: null,
        staffProfileId: staffProfile.id,
        sessionTermId,
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
  sessionTermId = ctx.profile.termId,
) {
  if (!departmentSubjectId) return;

  const staffProfile = await getTeacherStaffProfile(ctx);
  if (!staffProfile) return;

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

  const explicitSubjectAssignment = await ctx.db.staffSubject.findFirst({
    where: {
      deletedAt: null,
      staffProfilesId: staffProfile.id,
      departmentSubjectId,
      departmentSubject: {
        deletedAt: null,
        ...(effectiveTermId ? { sessionTermId: effectiveTermId } : {}),
      },
    },
    select: {
      id: true,
    },
  });

  if (explicitSubjectAssignment) return;

  const classroomWideAssignment =
    await ctx.db.staffClassroomDepartmentTermProfiles.findFirst({
      where: {
        deletedAt: null,
        classRoomDepartmentId: departmentSubject.classRoomDepartmentId,
        subjectAccessMode: "ALL",
        staffTermProfile: {
          deletedAt: null,
          staffProfileId: staffProfile.id,
          ...(effectiveTermId ? { sessionTermId: effectiveTermId } : {}),
        },
      },
      select: {
        id: true,
      },
    });

  if (!classroomWideAssignment) {
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
