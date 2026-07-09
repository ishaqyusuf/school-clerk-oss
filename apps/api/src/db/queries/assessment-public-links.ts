import type { TRPCContext } from "@api/trpc/init";
import { classroomDisplayName } from "@school-clerk/utils";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  assertTeacherCanAccessClassroomDepartment,
  assertTeacherCanAccessDepartmentSubject,
} from "../../lib/teacher-authorization";
import {
  dispatchSchoolNotification,
  dispatchUserNotification,
} from "../../lib/notifications";
import {
  assessmentPublicLinkStatusSchema,
  createAssessmentPublicLinkToken,
  getEffectiveAssessmentPublicLinkStatus,
  hashAssessmentPublicLinkToken,
  normalizeAssessmentPublicLinkSubjectScope,
  type AssessmentPublicLinkStatus,
  verifyAssessmentPublicLinkToken,
} from "./assessment-public-links-policy";

export const ASSESSMENT_PUBLIC_LINK_DURATION_PRESETS = [
  { hours: 24, label: "24 hours" },
  { hours: 48, label: "2 days" },
  { hours: 168, label: "7 days" },
] as const;

const assessmentPublicLinkScopeSchema = z.object({
  departmentId: z.string().min(1),
  selectedStudentTermFormIds: z.array(z.string()).default([]),
  selectedSubjectIds: z.array(z.string()).default([]),
  termId: z.string().min(1),
});

export const listAssessmentPublicLinksSchema = z
  .object({
    departmentId: z.string().optional().nullable(),
    termId: z.string().optional().nullable(),
  })
  .optional();

export const createAssessmentPublicLinkSchema =
  assessmentPublicLinkScopeSchema.extend({
    durationHours: z
      .number()
      .int()
      .min(1)
      .max(24 * 14)
      .default(24),
  });

export const requestAssessmentPublicLinkSchema =
  assessmentPublicLinkScopeSchema.extend({
    durationHours: z
      .number()
      .int()
      .min(1)
      .max(24 * 14)
      .default(24),
    reason: z.string().trim().min(8, "A reason is required."),
  });

export const approveAssessmentPublicLinkSchema = z.object({
  durationHours: z
    .number()
    .int()
    .min(1)
    .max(24 * 14)
    .optional()
    .nullable(),
  linkId: z.string().min(1),
});

export const rejectAssessmentPublicLinkSchema = z.object({
  linkId: z.string().min(1),
  note: z.string().trim().optional().nullable(),
});

export const revokeAssessmentPublicLinkSchema = z.object({
  linkId: z.string().min(1),
});

export const getPublicAssessmentLinkSchema = z.object({
  token: z.string().min(1),
});

export const updatePublicAssessmentScoreSchema = z.object({
  assessmentId: z.number(),
  departmentSubjectId: z.string().min(1),
  id: z.number().optional().nullable(),
  obtained: z.number().optional().nullable(),
  studentId: z.string().min(1),
  studentTermId: z.string().min(1),
  token: z.string().min(1),
});

type CurrentUser = {
  email: string;
  id: string;
  name: string;
  role: string | null;
};

type AssessmentPublicLinkRow = {
  approvedAt?: Date | null;
  approvedByName?: string | null;
  approvedByUserId?: string | null;
  classRoomDepartment?: {
    departmentName?: string | null;
    classRoom?: { name?: string | null } | null;
  } | null;
  classRoomDepartmentId: string;
  createdAt?: Date | null;
  createdByName?: string | null;
  createdByUserId?: string | null;
  expiresAt?: Date | null;
  id: string;
  lastUsedAt?: Date | null;
  reason?: string | null;
  rejectedAt?: Date | null;
  rejectedByName?: string | null;
  rejectionNote?: string | null;
  requestedDurationHours: number;
  requesterEmail?: string | null;
  requesterName?: string | null;
  requesterUserId?: string | null;
  revokedAt?: Date | null;
  revokedByName?: string | null;
  schoolProfile?: {
    name: string;
    subDomain: string;
  } | null;
  schoolProfileId: string;
  selectedDepartmentSubjectIds: string[];
  selectedStudentTermFormIds: string[];
  sessionTerm?: {
    title?: string | null;
    session?: {
      title?: string | null;
    } | null;
  } | null;
  sessionTermId: string;
  status: AssessmentPublicLinkStatus;
  tokenHash?: string | null;
};

function requireSchoolContext(ctx: TRPCContext) {
  const schoolId = ctx.profile.schoolId;

  if (!schoolId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Missing active school context.",
    });
  }

  return schoolId;
}

function requireCurrentUser(ctx: TRPCContext): CurrentUser {
  if (!ctx.currentUser) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to continue.",
    });
  }

  return ctx.currentUser;
}

function isAdminRole(role?: string | null) {
  return role === "Admin" || role === "ADMIN";
}

function requireAdmin(ctx: TRPCContext) {
  const user = requireCurrentUser(ctx);

  if (!isAdminRole(user.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only admins can manage public assessment links.",
    });
  }

  return user;
}

function expiresAtFromDuration(durationHours: number, now = new Date()) {
  return new Date(now.getTime() + durationHours * 60 * 60 * 1000);
}

function publicPathForToken(token: string) {
  return `/assessment-recording/public/${encodeURIComponent(token)}`;
}

function getClassroomLabel(link: AssessmentPublicLinkRow) {
  return classroomDisplayName({
    className: link.classRoomDepartment?.classRoom?.name,
    departmentName: link.classRoomDepartment?.departmentName,
  });
}

function getTermLabel(link: AssessmentPublicLinkRow) {
  return [link.sessionTerm?.session?.title, link.sessionTerm?.title]
    .filter(Boolean)
    .join(" • ");
}

function getScopeLabel(link: AssessmentPublicLinkRow) {
  return [
    getClassroomLabel(link),
    getTermLabel(link),
    `${link.selectedDepartmentSubjectIds.length} subject${
      link.selectedDepartmentSubjectIds.length === 1 ? "" : "s"
    }`,
  ]
    .filter(Boolean)
    .join(" • ");
}

function formatNotificationDate(value?: Date | null) {
  return value
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value)
    : null;
}

async function formatAssessmentPublicLink(link: AssessmentPublicLinkRow) {
  const effectiveStatus = getEffectiveAssessmentPublicLinkStatus(link);
  const publicUrl =
    effectiveStatus === "APPROVED"
      ? publicPathForToken(await createAssessmentPublicLinkToken(link.id))
      : null;

  return {
    approvedAt: link.approvedAt ?? null,
    approvedByName: link.approvedByName ?? null,
    classRoomDepartmentId: link.classRoomDepartmentId,
    classroomLabel: getClassroomLabel(link),
    createdAt: link.createdAt ?? null,
    createdByName: link.createdByName ?? null,
    effectiveStatus,
    expiresAt: link.expiresAt ?? null,
    id: link.id,
    lastUsedAt: link.lastUsedAt ?? null,
    publicUrl,
    reason: link.reason ?? null,
    rejectedAt: link.rejectedAt ?? null,
    rejectedByName: link.rejectedByName ?? null,
    rejectionNote: link.rejectionNote ?? null,
    requestedDurationHours: link.requestedDurationHours,
    requesterEmail: link.requesterEmail ?? null,
    requesterName: link.requesterName ?? null,
    requesterUserId: link.requesterUserId ?? null,
    revokedAt: link.revokedAt ?? null,
    revokedByName: link.revokedByName ?? null,
    scopeLabel: getScopeLabel(link),
    selectedDepartmentSubjectIds: link.selectedDepartmentSubjectIds,
    selectedStudentTermFormIds: link.selectedStudentTermFormIds,
    sessionTermId: link.sessionTermId,
    status: link.status,
    termLabel: getTermLabel(link),
  };
}

async function recordAssessmentPublicLinkActivity(
  ctx: TRPCContext,
  input: {
    author: string;
    description?: string | null;
    meta?: Record<string, unknown>;
    schoolProfileId: string;
    title: string;
    type:
      | "assessment_public_link_created"
      | "assessment_public_link_requested"
      | "assessment_public_link_approved"
      | "assessment_public_link_rejected"
      | "assessment_public_link_revoked"
      | "assessment_public_link_score_recorded";
    userId?: string | null;
  },
) {
  try {
    await ctx.db.activity.create({
      data: {
        author: input.author,
        description: input.description ?? null,
        meta: input.meta ?? undefined,
        schoolProfileId: input.schoolProfileId,
        source: "system",
        title: input.title,
        type: input.type,
        userId: input.userId ?? "public-assessment-link",
      },
    });
  } catch (error) {
    console.error("[assessment-public-link] activity log failed", error);
  }
}

async function resolveAssessmentPublicLinkScope(
  ctx: TRPCContext,
  input: z.infer<typeof assessmentPublicLinkScopeSchema>,
) {
  const schoolId = requireSchoolContext(ctx);
  const term = await ctx.db.sessionTerm.findFirst({
    where: {
      deletedAt: null,
      id: input.termId,
      schoolId,
    },
    select: {
      id: true,
      sessionId: true,
      title: true,
      session: {
        select: {
          title: true,
        },
      },
    },
  });

  if (!term) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Selected term is not available for this school.",
    });
  }

  const department = await ctx.db.classRoomDepartment.findFirst({
    where: {
      deletedAt: null,
      id: input.departmentId,
      schoolProfileId: schoolId,
      classRoom: {
        deletedAt: null,
        schoolSessionId: term.sessionId,
      },
    },
    select: {
      id: true,
      departmentName: true,
      classRoom: {
        select: {
          name: true,
        },
      },
      subjects: {
        where: {
          deletedAt: null,
          sessionTermId: term.id,
        },
        select: {
          id: true,
        },
        orderBy: {
          subject: {
            title: "asc",
          },
        },
      },
    },
  });

  if (!department) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Selected classroom is not available for this term.",
    });
  }

  const currentSubjectIds = department.subjects.map((subject) => subject.id);
  const selectedDepartmentSubjectIds =
    normalizeAssessmentPublicLinkSubjectScope({
      currentSubjectIds,
      selectedSubjectIds: input.selectedSubjectIds,
    });

  if (!selectedDepartmentSubjectIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Select at least one subject before creating a public link.",
    });
  }

  const selectedStudentTermFormIds = Array.from(
    new Set(input.selectedStudentTermFormIds.filter(Boolean)),
  );

  if (selectedStudentTermFormIds.length) {
    const validStudentTermForms = await ctx.db.studentTermForm.findMany({
      where: {
        classroomDepartmentId: department.id,
        deletedAt: null,
        id: {
          in: selectedStudentTermFormIds,
        },
        schoolProfileId: schoolId,
        sessionTermId: term.id,
      },
      select: {
        id: true,
      },
    });

    if (validStudentTermForms.length !== selectedStudentTermFormIds.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "One or more selected students are outside this link scope.",
      });
    }
  }

  return {
    classRoomDepartmentId: department.id,
    classroomLabel: classroomDisplayName({
      className: department.classRoom?.name,
      departmentName: department.departmentName,
    }),
    schoolProfileId: schoolId,
    selectedDepartmentSubjectIds,
    selectedStudentTermFormIds,
    sessionTermId: term.id,
    termLabel: [term.session?.title, term.title].filter(Boolean).join(" • "),
  };
}

async function assertUserCanRequestScope(
  ctx: TRPCContext,
  scope: {
    classRoomDepartmentId: string;
    selectedDepartmentSubjectIds: string[];
    sessionTermId: string;
  },
) {
  const user = requireCurrentUser(ctx);

  if (isAdminRole(user.role)) return;

  await assertTeacherCanAccessClassroomDepartment(
    ctx,
    scope.classRoomDepartmentId,
    scope.sessionTermId,
  );

  for (const subjectId of scope.selectedDepartmentSubjectIds) {
    await assertTeacherCanAccessDepartmentSubject(
      ctx,
      subjectId,
      scope.sessionTermId,
    );
  }
}

async function updateLinkTokenHash(ctx: TRPCContext, linkId: string) {
  const token = await createAssessmentPublicLinkToken(linkId);
  const tokenHash = await hashAssessmentPublicLinkToken(token);

  const link = await ctx.db.assessmentPublicLink.update({
    where: {
      id: linkId,
    },
    data: {
      tokenHash,
    },
    include: assessmentPublicLinkInclude,
  });

  return link as AssessmentPublicLinkRow;
}

const assessmentPublicLinkInclude = {
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
  schoolProfile: {
    select: {
      name: true,
      subDomain: true,
    },
  },
  sessionTerm: {
    select: {
      title: true,
      session: {
        select: {
          title: true,
        },
      },
    },
  },
} as const;

export async function listAssessmentPublicLinks(
  ctx: TRPCContext,
  input?: z.infer<typeof listAssessmentPublicLinksSchema>,
) {
  const schoolId = requireSchoolContext(ctx);
  const user = requireCurrentUser(ctx);

  const links = await ctx.db.assessmentPublicLink.findMany({
    where: {
      classRoomDepartmentId: input?.departmentId ?? undefined,
      deletedAt: null,
      schoolProfileId: schoolId,
      sessionTermId: input?.termId ?? undefined,
      ...(isAdminRole(user.role) ? {} : { requesterUserId: user.id }),
    },
    include: assessmentPublicLinkInclude,
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return Promise.all(
    links.map((link) =>
      formatAssessmentPublicLink(link as AssessmentPublicLinkRow),
    ),
  );
}

export async function createAssessmentPublicLink(
  ctx: TRPCContext,
  input: z.infer<typeof createAssessmentPublicLinkSchema>,
) {
  const user = requireAdmin(ctx);
  const scope = await resolveAssessmentPublicLinkScope(ctx, input);
  const now = new Date();

  const created = await ctx.db.assessmentPublicLink.create({
    data: {
      approvedAt: now,
      approvedByName: user.name,
      approvedByUserId: user.id,
      classRoomDepartmentId: scope.classRoomDepartmentId,
      createdByName: user.name,
      createdByUserId: user.id,
      expiresAt: expiresAtFromDuration(input.durationHours, now),
      requestedDurationHours: input.durationHours,
      requesterEmail: user.email,
      requesterName: user.name,
      requesterUserId: user.id,
      schoolProfileId: scope.schoolProfileId,
      selectedDepartmentSubjectIds: scope.selectedDepartmentSubjectIds,
      selectedStudentTermFormIds: scope.selectedStudentTermFormIds,
      sessionTermId: scope.sessionTermId,
      status: "APPROVED",
    },
    include: assessmentPublicLinkInclude,
  });
  const link = await updateLinkTokenHash(ctx, created.id);

  await recordAssessmentPublicLinkActivity(ctx, {
    author: user.name,
    description: `Generated public assessment link for ${scope.classroomLabel}.`,
    meta: {
      classRoomDepartmentId: scope.classRoomDepartmentId,
      linkId: link.id,
      selectedDepartmentSubjectIds: scope.selectedDepartmentSubjectIds,
      sessionTermId: scope.sessionTermId,
    },
    schoolProfileId: scope.schoolProfileId,
    title: "Public assessment link generated",
    type: "assessment_public_link_created",
    userId: user.id,
  });

  return formatAssessmentPublicLink(link);
}

export async function requestAssessmentPublicLink(
  ctx: TRPCContext,
  input: z.infer<typeof requestAssessmentPublicLinkSchema>,
) {
  const user = requireCurrentUser(ctx);
  const scope = await resolveAssessmentPublicLinkScope(ctx, input);
  await assertUserCanRequestScope(ctx, scope);

  const link = (await ctx.db.assessmentPublicLink.create({
    data: {
      classRoomDepartmentId: scope.classRoomDepartmentId,
      createdByName: user.name,
      createdByUserId: user.id,
      reason: input.reason,
      requestedDurationHours: input.durationHours,
      requesterEmail: user.email,
      requesterName: user.name,
      requesterUserId: user.id,
      schoolProfileId: scope.schoolProfileId,
      selectedDepartmentSubjectIds: scope.selectedDepartmentSubjectIds,
      selectedStudentTermFormIds: scope.selectedStudentTermFormIds,
      sessionTermId: scope.sessionTermId,
      status: "PENDING",
    },
    include: assessmentPublicLinkInclude,
  })) as AssessmentPublicLinkRow;

  await recordAssessmentPublicLinkActivity(ctx, {
    author: user.name,
    description: input.reason,
    meta: {
      classRoomDepartmentId: scope.classRoomDepartmentId,
      linkId: link.id,
      selectedDepartmentSubjectIds: scope.selectedDepartmentSubjectIds,
      sessionTermId: scope.sessionTermId,
    },
    schoolProfileId: scope.schoolProfileId,
    title: "Public assessment link requested",
    type: "assessment_public_link_requested",
    userId: user.id,
  });

  await dispatchSchoolNotification(ctx, {
    audience: "academic_admin",
    payload: {
      link: "/assessment-recording",
      reason: input.reason,
      requesterEmail: user.email,
      requesterName: user.name,
      schoolName: link.schoolProfile?.name ?? "School Clerk",
      scopeLabel: getScopeLabel(link),
    },
    type: "assessment_public_link_requested",
  });

  return formatAssessmentPublicLink(link);
}

export async function approveAssessmentPublicLink(
  ctx: TRPCContext,
  input: z.infer<typeof approveAssessmentPublicLinkSchema>,
) {
  const user = requireAdmin(ctx);
  const schoolId = requireSchoolContext(ctx);
  const existing = await ctx.db.assessmentPublicLink.findFirst({
    where: {
      deletedAt: null,
      id: input.linkId,
      schoolProfileId: schoolId,
      status: "PENDING",
    },
    include: assessmentPublicLinkInclude,
  });

  if (!existing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Pending public assessment link request was not found.",
    });
  }

  const now = new Date();
  await ctx.db.assessmentPublicLink.update({
    where: {
      id: existing.id,
    },
    data: {
      approvedAt: now,
      approvedByName: user.name,
      approvedByUserId: user.id,
      expiresAt: expiresAtFromDuration(
        input.durationHours ?? existing.requestedDurationHours,
        now,
      ),
      requestedDurationHours:
        input.durationHours ?? existing.requestedDurationHours,
      status: "APPROVED",
    },
  });
  const link = await updateLinkTokenHash(ctx, existing.id);

  await recordAssessmentPublicLinkActivity(ctx, {
    author: user.name,
    description: `Approved public assessment link request for ${getScopeLabel(
      link,
    )}.`,
    meta: {
      linkId: link.id,
      requesterUserId: link.requesterUserId,
    },
    schoolProfileId: schoolId,
    title: "Public assessment link approved",
    type: "assessment_public_link_approved",
    userId: user.id,
  });

  const formatted = await formatAssessmentPublicLink(link);

  if (link.requesterUserId) {
    await dispatchUserNotification(ctx, {
      payload: {
        actorName: user.name,
        expiresAt: formatNotificationDate(link.expiresAt),
        link: formatted.publicUrl,
        requesterEmail: link.requesterEmail,
        requesterName: link.requesterName ?? "there",
        schoolName: link.schoolProfile?.name ?? "School Clerk",
        scopeLabel: formatted.scopeLabel,
      },
      type: "assessment_public_link_approved",
      userId: link.requesterUserId,
    });
  }

  return formatted;
}

export async function rejectAssessmentPublicLink(
  ctx: TRPCContext,
  input: z.infer<typeof rejectAssessmentPublicLinkSchema>,
) {
  const user = requireAdmin(ctx);
  const schoolId = requireSchoolContext(ctx);
  const existing = await ctx.db.assessmentPublicLink.findFirst({
    where: {
      deletedAt: null,
      id: input.linkId,
      schoolProfileId: schoolId,
      status: "PENDING",
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Pending public assessment link request was not found.",
    });
  }

  const link = (await ctx.db.assessmentPublicLink.update({
    where: {
      id: existing.id,
    },
    data: {
      rejectedAt: new Date(),
      rejectedByName: user.name,
      rejectedByUserId: user.id,
      rejectionNote: input.note ?? null,
      status: "REJECTED",
    },
    include: assessmentPublicLinkInclude,
  })) as AssessmentPublicLinkRow;

  await recordAssessmentPublicLinkActivity(ctx, {
    author: user.name,
    description: input.note ?? null,
    meta: {
      linkId: link.id,
      requesterUserId: link.requesterUserId,
    },
    schoolProfileId: schoolId,
    title: "Public assessment link rejected",
    type: "assessment_public_link_rejected",
    userId: user.id,
  });

  const formatted = await formatAssessmentPublicLink(link);

  if (link.requesterUserId) {
    await dispatchUserNotification(ctx, {
      payload: {
        actorName: user.name,
        link: "/assessment-recording",
        note: input.note ?? null,
        requesterEmail: link.requesterEmail,
        requesterName: link.requesterName ?? "there",
        schoolName: link.schoolProfile?.name ?? "School Clerk",
        scopeLabel: formatted.scopeLabel,
      },
      type: "assessment_public_link_rejected",
      userId: link.requesterUserId,
    });
  }

  return formatted;
}

export async function revokeAssessmentPublicLink(
  ctx: TRPCContext,
  input: z.infer<typeof revokeAssessmentPublicLinkSchema>,
) {
  const user = requireAdmin(ctx);
  const schoolId = requireSchoolContext(ctx);
  const existing = await ctx.db.assessmentPublicLink.findFirst({
    where: {
      deletedAt: null,
      id: input.linkId,
      schoolProfileId: schoolId,
      status: {
        in: ["APPROVED", "EXPIRED"],
      },
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Active public assessment link was not found.",
    });
  }

  const link = (await ctx.db.assessmentPublicLink.update({
    where: {
      id: existing.id,
    },
    data: {
      revokedAt: new Date(),
      revokedByName: user.name,
      revokedByUserId: user.id,
      status: "REVOKED",
    },
    include: assessmentPublicLinkInclude,
  })) as AssessmentPublicLinkRow;

  await recordAssessmentPublicLinkActivity(ctx, {
    author: user.name,
    description: `Revoked public assessment link for ${getScopeLabel(link)}.`,
    meta: {
      linkId: link.id,
      requesterUserId: link.requesterUserId,
    },
    schoolProfileId: schoolId,
    title: "Public assessment link revoked",
    type: "assessment_public_link_revoked",
    userId: user.id,
  });

  return formatAssessmentPublicLink(link);
}

async function getAssessmentPublicLinkByToken(ctx: TRPCContext, token: string) {
  const verification = await verifyAssessmentPublicLinkToken(token);

  if (!verification.valid || !verification.id) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "This public assessment link is invalid.",
    });
  }

  const tokenHash = await hashAssessmentPublicLinkToken(token);
  const link = await ctx.db.assessmentPublicLink.findFirst({
    where: {
      deletedAt: null,
      id: verification.id,
      tokenHash,
    },
    include: assessmentPublicLinkInclude,
  });

  if (!link) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "This public assessment link is invalid.",
    });
  }

  return link as AssessmentPublicLinkRow;
}

async function resolvePublicAssessmentLinkForUse(
  ctx: TRPCContext,
  token: string,
) {
  const link = await getAssessmentPublicLinkByToken(ctx, token);
  const effectiveStatus = getEffectiveAssessmentPublicLinkStatus(link);

  if (effectiveStatus === "EXPIRED" && link.status === "APPROVED") {
    await ctx.db.assessmentPublicLink.update({
      where: {
        id: link.id,
      },
      data: {
        status: "EXPIRED",
      },
    });
    link.status = "EXPIRED";
  }

  return {
    effectiveStatus,
    link,
  };
}

export async function getPublicAssessmentLink(
  ctx: TRPCContext,
  input: z.infer<typeof getPublicAssessmentLinkSchema>,
) {
  const { effectiveStatus, link } = await resolvePublicAssessmentLinkForUse(
    ctx,
    input.token,
  );
  const dto = await formatAssessmentPublicLink(link);

  if (effectiveStatus !== "APPROVED") {
    return {
      link: dto,
      message:
        effectiveStatus === "EXPIRED"
          ? "This public assessment link has expired."
          : "This public assessment link is not available.",
      report: null,
      status: effectiveStatus,
    };
  }

  await ctx.db.assessmentPublicLink.update({
    where: {
      id: link.id,
    },
    data: {
      lastUsedAt: new Date(),
    },
  });

  const department = await ctx.db.classRoomDepartment.findFirst({
    where: {
      deletedAt: null,
      id: link.classRoomDepartmentId,
      schoolProfileId: link.schoolProfileId,
    },
    select: {
      departmentName: true,
      subjects: {
        where: {
          classRoomDepartmentId: link.classRoomDepartmentId,
          deletedAt: null,
          id: {
            in: link.selectedDepartmentSubjectIds,
          },
          sessionTermId: link.sessionTermId,
        },
        select: {
          id: true,
          assessments: {
            where: {
              deletedAt: null,
              isGroup: false,
            },
            orderBy: [{ index: "asc" }, { id: "asc" }],
            select: {
              id: true,
              title: true,
              parentAssessment: {
                select: {
                  title: true,
                },
              },
              percentageObtainable: true,
              obtainable: true,
              index: true,
              assessmentResults: {
                where: {
                  deletedAt: null,
                  studentTermForm: {
                    sessionTermId: link.sessionTermId,
                  },
                },
                select: {
                  id: true,
                  obtained: true,
                  percentageScore: true,
                  studentTermFormId: true,
                  studentId: true,
                },
              },
            },
          },
          subject: {
            select: {
              title: true,
            },
          },
        },
        orderBy: {
          subject: {
            title: "asc",
          },
        },
      },
      studentTermForms: {
        orderBy: [
          {
            student: {
              gender: "asc",
            },
          },
          {
            student: {
              name: "asc",
            },
          },
        ],
        where: {
          classroomDepartmentId: link.classRoomDepartmentId,
          deletedAt: null,
          ...(link.selectedStudentTermFormIds.length
            ? {
                id: {
                  in: link.selectedStudentTermFormIds,
                },
              }
            : {}),
          schoolProfileId: link.schoolProfileId,
          sessionTermId: link.sessionTermId,
          student: {
            deletedAt: null,
          },
        },
        select: {
          id: true,
          classroomDepartmentId: true,
          student: {
            select: {
              id: true,
              gender: true,
              name: true,
              otherName: true,
              surname: true,
            },
          },
        },
      },
    },
  });

  return {
    link: dto,
    message: null,
    report: department,
    status: effectiveStatus,
  };
}

export async function updatePublicAssessmentScore(
  ctx: TRPCContext,
  input: z.infer<typeof updatePublicAssessmentScoreSchema>,
) {
  const { effectiveStatus, link } = await resolvePublicAssessmentLinkForUse(
    ctx,
    input.token,
  );

  if (effectiveStatus !== "APPROVED") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This public assessment link is no longer active.",
    });
  }

  if (!link.selectedDepartmentSubjectIds.includes(input.departmentSubjectId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This subject is outside the public link scope.",
    });
  }

  const [departmentSubject, assessment, studentTermForm] = await Promise.all([
    ctx.db.departmentSubject.findFirst({
      where: {
        classRoomDepartmentId: link.classRoomDepartmentId,
        deletedAt: null,
        id: input.departmentSubjectId,
        sessionTermId: link.sessionTermId,
        classRoomDepartment: {
          schoolProfileId: link.schoolProfileId,
        },
      },
      select: {
        id: true,
      },
    }),
    ctx.db.classroomSubjectAssessment.findFirst({
      where: {
        deletedAt: null,
        departmentSubjectId: input.departmentSubjectId,
        id: input.assessmentId,
        isGroup: false,
      },
      select: {
        id: true,
      },
    }),
    ctx.db.studentTermForm.findFirst({
      where: {
        classroomDepartmentId: link.classRoomDepartmentId,
        deletedAt: null,
        id: input.studentTermId,
        schoolProfileId: link.schoolProfileId,
        sessionTermId: link.sessionTermId,
        studentId: input.studentId,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!departmentSubject || !assessment || !studentTermForm) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This score is outside the public link scope.",
    });
  }

  if (
    link.selectedStudentTermFormIds.length &&
    !link.selectedStudentTermFormIds.includes(input.studentTermId)
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This student is outside the public link scope.",
    });
  }

  let result: { id: number; obtained: number | null };

  if (input.id) {
    const existingRecord = await ctx.db.studentAssessmentRecord.findFirst({
      where: {
        classSubjectAssessmentId: input.assessmentId,
        deletedAt: null,
        id: input.id,
        studentId: input.studentId,
        studentTermFormId: input.studentTermId,
      },
      select: {
        id: true,
      },
    });

    if (!existingRecord) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This score record is outside the public link scope.",
      });
    }

    result = await ctx.db.studentAssessmentRecord.update({
      where: {
        id: existingRecord.id,
      },
      data: {
        obtained: input.obtained,
      },
      select: {
        id: true,
        obtained: true,
      },
    });
  } else {
    result = await ctx.db.studentAssessmentRecord.create({
      data: {
        classSubjectAssessmentId: input.assessmentId,
        obtained: input.obtained,
        studentId: input.studentId,
        studentTermFormId: input.studentTermId,
      },
      select: {
        id: true,
        obtained: true,
      },
    });
  }

  await Promise.all([
    ctx.db.assessmentPublicLink.update({
      where: {
        id: link.id,
      },
      data: {
        lastUsedAt: new Date(),
      },
    }),
    recordAssessmentPublicLinkActivity(ctx, {
      author: "Public assessment link",
      description: "A score was recorded through a public assessment link.",
      meta: {
        assessmentId: input.assessmentId,
        classRoomDepartmentId: link.classRoomDepartmentId,
        departmentSubjectId: input.departmentSubjectId,
        linkId: link.id,
        studentTermFormId: input.studentTermId,
      },
      schoolProfileId: link.schoolProfileId,
      title: "Public assessment score recorded",
      type: "assessment_public_link_score_recorded",
      userId:
        link.requesterUserId ??
        link.approvedByUserId ??
        link.createdByUserId ??
        "public-assessment-link",
    }),
  ]);

  return result;
}
