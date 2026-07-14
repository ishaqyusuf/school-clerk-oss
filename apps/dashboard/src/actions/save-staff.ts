"use server";

import { staffChanged } from "@/actions/cache/cache-control";
import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { actionClient } from "@/actions/safe-action";
import {
  completeStaffOnboardingSchema,
  createStaffSchema,
  staffRoleSchema,
} from "@/actions/schema";
import {
  sendStaffInvitationEmailTaskId,
  type SendStaffInvitationEmailPayload,
} from "@school-clerk/utils/task-contracts";
import { tasks } from "@trigger.dev/sdk";
import { z } from "zod";
import { ensureCredentialAccount } from "./ensure-credential-account";
import { getTenantDashboardEmailUrl } from "./tenant-email-url";

import {
  assertStaffAcademicAssignmentReferences,
  buildStaffAcademicAccessPersistence,
  collectStaffAcademicAssignmentReferenceIds,
  ensureNotificationContact,
  normalizeStaffAcademicAssignments,
  prisma,
} from "@school-clerk/db";
import { createNotificationFromType } from "@school-clerk/notifications";
import {
  STAFF_ASSIGNMENT_ROLES,
  type StaffInviteStatus,
} from "@school-clerk/utils/constants";

function emptyToUndefined(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function roleSupportsAssignments(role: string) {
  return STAFF_ASSIGNMENT_ROLES.includes(
    role as (typeof STAFF_ASSIGNMENT_ROLES)[number],
  );
}

function buildPendingStaffName(email: string) {
  const localPart = email.split("@")[0] ?? "staff";
  const formatted = localPart
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!formatted) {
    return "Pending staff";
  }

  return formatted.replace(/\b\w/g, (match) => match.toUpperCase());
}

async function sendOnboardingInvite({
  email,
  invitedByName,
  roleLabel,
  schoolName,
  staffName,
  staffId,
  userId,
  tenantSlug,
}: {
  email: string;
  invitedByName?: string | null;
  roleLabel: string;
  schoolName: string;
  staffName: string;
  staffId: string;
  userId: string;
  tenantSlug: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY is not configured; onboarding email was not sent.",
    );
  }

  if (
    process.env.NODE_ENV === "development" &&
    !process.env.DEV_EMAIL_RECIPIENT?.trim()
  ) {
    throw new Error(
      "DEV_EMAIL_RECIPIENT must be configured in development before sending email.",
    );
  }

  const inviteLink = await createCopyableOnboardingLink({
    email,
    staffId,
    tenantSlug,
    userId,
  });

  await tasks.trigger(sendStaffInvitationEmailTaskId, {
    ctaHref: inviteLink,
    email,
    invitedByName,
    roleLabel,
    schoolName,
    staffName,
  } satisfies SendStaffInvitationEmailPayload);

  return inviteLink;
}

async function createCopyableOnboardingLink({
  email,
  staffId,
  tenantSlug,
  userId,
}: {
  email: string;
  staffId: string;
  tenantSlug: string;
  userId: string;
}) {
  const token = crypto.randomUUID();
  const identifier = `reset-password:${token}`;

  await prisma.verification.create({
    data: {
      identifier,
      value: userId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  const inviteLink = new URL(
    await getTenantDashboardEmailUrl({
      path: "/reset-password",
      tenantSlug,
    }),
  );
  inviteLink.searchParams.set("onboarding", "1");
  inviteLink.searchParams.set("staffId", staffId);
  inviteLink.searchParams.set("email", email);
  inviteLink.searchParams.set("token", token);

  return inviteLink.toString();
}

function inviteErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Failed to send onboarding email. Please verify the email address and try again.";
}

function isDevelopmentEmailConfigurationError(error: unknown) {
  if (process.env.NODE_ENV !== "development" || !(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("DEV_EMAIL_RECIPIENT") ||
    error.message.includes("RESEND_API_KEY") ||
    error.message.includes("domain is not verified")
  );
}

async function tryCreateStaffInvitationNotification(
  input: Parameters<typeof createStaffInvitationNotification>[0],
) {
  try {
    await createStaffInvitationNotification(input);
  } catch (error) {
    console.error(
      "[staff-invite] Staff invitation notification failed after email send",
      error,
    );
  }
}

async function syncInviteState({
  staffId,
  status,
  error,
  resent,
}: {
  staffId: string;
  status: StaffInviteStatus;
  error?: string | null;
  resent?: boolean;
}) {
  const now = new Date();
  await prisma.staffProfile.update({
    where: {
      id: staffId,
    },
    data: {
      inviteStatus: status,
      inviteSentAt: status === "PENDING" ? now : undefined,
      inviteResentAt: resent ? now : undefined,
      lastInviteError: error ?? null,
    },
  });
}

async function createStaffInvitationNotification(input: {
  actorName?: string | null;
  actorUserId?: string | null;
  payload: {
    inviteLink?: string | null;
    invitedByName?: string | null;
    recipientEmail: string;
    roleLabel: string;
    schoolName: string;
    staffId: string;
    staffName: string;
  };
  schoolProfileId: string;
  userId: string;
}) {
  const preference = await prisma.notificationPreference.findFirst({
    where: {
      deletedAt: null,
      schoolProfileId: input.schoolProfileId,
      type: "staff_invitation",
      userId: input.userId,
    },
    select: {
      inApp: true,
    },
  });

  if (preference?.inApp === false) {
    return;
  }

  const notification = createNotificationFromType(
    "staff_invitation",
    input.payload,
  );

  if (!notification.channels.includes("in_app")) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const recipientContact = await ensureNotificationContact(tx, {
      displayName: input.payload.staffName,
      role: "user",
      schoolProfileId: input.schoolProfileId,
      userId: input.userId,
    });

    const authorContact = input.actorUserId
      ? await ensureNotificationContact(tx, {
          displayName: input.actorName ?? undefined,
          role: "user",
          schoolProfileId: input.schoolProfileId,
          userId: input.actorUserId,
        })
      : null;

    await tx.notification.create({
      data: {
        action: notification.action ?? undefined,
        authorContactId: authorContact?.id,
        body: notification.body,
        content: notification.body,
        headline: notification.title,
        link: notification.link,
        schoolProfileId: input.schoolProfileId,
        subject: notification.emailTemplate?.subject ?? notification.title,
        tags: {
          create: [
            {
              tagName: "staff_email",
              tagValue: input.payload.recipientEmail,
            },
            {
              tagName: "staff_name",
              tagValue: input.payload.staffName,
            },
          ],
        },
        title: notification.title,
        type: notification.type,
        userId: input.userId,
        recipients: {
          create: {
            recipientContactId: recipientContact.id,
          },
        },
      },
    });
  });
}

async function getSchoolContext() {
  const profile = await getAuthCookie();

  if (!profile.schoolId || !profile.sessionId || !profile.termId) {
    throw new Error("Missing active school session context.");
  }

  if (!profile.domain) {
    throw new Error("Missing active school tenant context.");
  }

  const school = await prisma.schoolProfile.findUnique({
    where: {
      id: profile.schoolId,
    },
    select: {
      id: true,
      accountId: true,
      name: true,
    },
  });

  const actor = profile.auth?.userId
    ? await prisma.user.findFirst({
        where: {
          deletedAt: null,
          id: profile.auth.userId,
        },
        select: {
          name: true,
        },
      })
    : null;

  if (!school) {
    throw new Error("School not found.");
  }

  return {
    actor,
    profile,
    school,
    tenantSlug: profile.domain,
  };
}

export const saveStaffAction = actionClient
  .schema(createStaffSchema)
  .action(async ({ parsedInput }) => {
    const { actor, profile, school, tenantSlug } = await getSchoolContext();

    const email = normalizeEmail(parsedInput.email);
    const assignments = roleSupportsAssignments(parsedInput.role)
      ? normalizeStaffAcademicAssignments(parsedInput.assignments)
      : [];

    const savedStaff = await prisma.$transaction(async (tx) => {
      const existingStaff = parsedInput.staffId
        ? await tx.staffProfile.findFirst({
            where: {
              id: parsedInput.staffId,
              schoolProfileId: profile.schoolId,
              deletedAt: null,
            },
            select: {
              id: true,
              email: true,
              name: true,
              inviteStatus: true,
            },
          })
        : null;

      if (parsedInput.staffId && !existingStaff) {
        throw new Error("Staff record not found.");
      }

      const {
        classRoomIds: requestedClassIds,
        classRoomDepartmentIds: requestedClassroomIds,
        subjectIds: requestedSubjectIds,
        departmentSubjectIds: selectedSubjectIds,
      } = collectStaffAcademicAssignmentReferenceIds(assignments);

      const [
        validClasses,
        validClassrooms,
        validSubjects,
        validDepartmentSubjects,
      ] = await Promise.all([
        requestedClassIds.length
          ? tx.classRoom.findMany({
              where: {
                id: {
                  in: requestedClassIds,
                },
                deletedAt: null,
                schoolProfileId: profile.schoolId,
                schoolSessionId: profile.sessionId,
              },
              select: {
                id: true,
              },
            })
          : Promise.resolve([]),
        requestedClassroomIds.length
          ? tx.classRoomDepartment.findMany({
              where: {
                id: {
                  in: requestedClassroomIds,
                },
                deletedAt: null,
                schoolProfileId: profile.schoolId,
                classRoom: {
                  schoolSessionId: profile.sessionId,
                  deletedAt: null,
                },
              },
              select: {
                id: true,
              },
            })
          : Promise.resolve([]),
        requestedSubjectIds.length
          ? tx.subject.findMany({
              where: {
                id: {
                  in: requestedSubjectIds,
                },
                deletedAt: null,
                schoolProfileId: profile.schoolId,
              },
              select: {
                id: true,
              },
            })
          : Promise.resolve([]),
        selectedSubjectIds.length
          ? tx.departmentSubject.findMany({
              where: {
                id: {
                  in: selectedSubjectIds,
                },
                deletedAt: null,
                sessionTermId: profile.termId,
                classRoomDepartment: {
                  deletedAt: null,
                  schoolProfileId: profile.schoolId,
                  classRoom: {
                    deletedAt: null,
                    schoolSessionId: profile.sessionId,
                  },
                },
              },
              select: {
                id: true,
                classRoomDepartmentId: true,
                subjectId: true,
              },
            })
          : Promise.resolve([]),
      ]);

      assertStaffAcademicAssignmentReferences({
        assignments,
        validClassIds: validClasses,
        validClassRoomDepartmentIds: validClassrooms,
        validSubjectIds: validSubjects,
        validDepartmentSubjects,
      });

      const resolvedName =
        existingStaff?.name?.trim() || buildPendingStaffName(email);
      const emailChanged =
        Boolean(existingStaff?.email) && existingStaff?.email !== email;
      const shouldSendInvite =
        !existingStaff ||
        emailChanged ||
        existingStaff.inviteStatus === "NOT_SENT" ||
        existingStaff.inviteStatus === "FAILED";

      const staffProfile = existingStaff
        ? await tx.staffProfile.update({
            where: {
              id: existingStaff.id,
            },
            data: {
              email,
              name: resolvedName,
              inviteStatus: shouldSendInvite
                ? "PENDING"
                : existingStaff.inviteStatus,
              onboardedAt: emailChanged ? null : undefined,
            },
          })
        : await tx.staffProfile.create({
            data: {
              email,
              name: resolvedName,
              schoolProfileId: profile.schoolId,
              inviteStatus: "PENDING",
            },
          });

      const termProfile =
        (await tx.staffTermProfile.findFirst({
          where: {
            staffProfileId: staffProfile.id,
            schoolSessionId: profile.sessionId,
            sessionTermId: profile.termId,
            deletedAt: null,
          },
          select: {
            id: true,
          },
        })) ??
        (await tx.staffTermProfile.create({
          data: {
            staffProfileId: staffProfile.id,
            schoolSessionId: profile.sessionId,
            sessionTermId: profile.termId,
          },
          select: {
            id: true,
          },
        }));

      await tx.staffClassroomDepartmentTermProfiles.updateMany({
        where: {
          staffTermProfileId: termProfile.id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      const {
        legacyClassroomAssignments,
        academicAccessGrants,
        selectedDepartmentSubjectIds,
      } = buildStaffAcademicAccessPersistence({
        assignments,
        staffTermProfileId: termProfile.id,
      });

      if (legacyClassroomAssignments.length) {
        await tx.staffClassroomDepartmentTermProfiles.createMany({
          data: legacyClassroomAssignments,
        });
      }

      await tx.staffAcademicAccessGrant.updateMany({
        where: {
          staffTermProfileId: termProfile.id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      if (academicAccessGrants.length) {
        await tx.staffAcademicAccessGrant.createMany({
          data: academicAccessGrants,
        });
      }

      await tx.staffSubject.updateMany({
        where: {
          staffProfilesId: staffProfile.id,
          deletedAt: null,
          departmentSubject: {
            sessionTermId: profile.termId,
          },
        },
        data: {
          deletedAt: new Date(),
        },
      });

      if (selectedDepartmentSubjectIds.length) {
        await tx.staffSubject.createMany({
          data: selectedDepartmentSubjectIds.map((departmentSubjectId) => ({
            staffProfilesId: staffProfile.id,
            departmentSubjectId,
          })),
        });
      }

      const existingUser = await tx.user.findFirst({
        where: {
          saasAccountId: school.accountId,
          deletedAt: null,
          OR: [
            {
              email,
            },
            ...(existingStaff?.email
              ? [
                  {
                    email: existingStaff.email,
                  },
                ]
              : []),
          ],
        },
        select: {
          id: true,
        },
      });

      let userId: string;

      if (existingUser) {
        const updatedUser = await tx.user.update({
          where: {
            id: existingUser.id,
          },
          data: {
            name: resolvedName,
            email,
            role: parsedInput.role,
          },
          select: {
            id: true,
          },
        });
        userId = updatedUser.id;
      } else {
        const createdUser = await tx.user.create({
          data: {
            name: resolvedName,
            email,
            role: parsedInput.role,
            saasAccountId: school.accountId,
          },
          select: {
            id: true,
          },
        });
        userId = createdUser.id;
      }

      await ensureCredentialAccount(tx, userId);

      return {
        id: staffProfile.id,
        email,
        name: resolvedName,
        shouldSendInvite,
        userId,
      };
    });

    let invited = false;
    let inviteError: string | null = null;

    if (savedStaff.shouldSendInvite) {
      try {
        const inviteLink = await sendOnboardingInvite({
          email: savedStaff.email,
          invitedByName: actor?.name ?? null,
          roleLabel: parsedInput.role,
          schoolName: school.name,
          staffName: savedStaff.name,
          staffId: savedStaff.id,
          tenantSlug,
          userId: savedStaff.userId,
        });
        invited = true;
        await syncInviteState({
          staffId: savedStaff.id,
          status: "PENDING",
        });
        await tryCreateStaffInvitationNotification({
          actorName: actor?.name ?? null,
          actorUserId: profile.auth?.userId ?? null,
          payload: {
            inviteLink,
            invitedByName: actor?.name ?? null,
            recipientEmail: savedStaff.email,
            roleLabel: parsedInput.role,
            schoolName: school.name,
            staffId: savedStaff.id,
            staffName: savedStaff.name,
          },
          schoolProfileId: profile.schoolId!,
          userId: savedStaff.userId,
        });
        await prisma.schoolProfile.update({
          where: {
            id: profile.schoolId!,
          },
          data: {
            onboardingCompletedAt: new Date(),
          },
        });
      } catch (error) {
        console.error("[staff-invite] Failed to send invite email", error);
        inviteError = inviteErrorMessage(error);
        await syncInviteState({
          staffId: savedStaff.id,
          status: "FAILED",
          error: inviteError,
        });
      }
    }

    staffChanged();

    return {
      invited,
      inviteError,
      staffId: savedStaff.id,
    };
  });

export const resendStaffOnboardingAction = actionClient
  .schema(
    z.object({
      staffId: z.string(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const { actor, profile, school, tenantSlug } = await getSchoolContext();

    const staff = await prisma.staffProfile.findFirst({
      where: {
        id: parsedInput.staffId,
        schoolProfileId: profile.schoolId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        onboardedAt: true,
      },
    });

    if (!staff?.email) {
      throw new Error("This staff member does not have an onboarding email.");
    }

    if (staff.onboardedAt) {
      throw new Error("This staff member has already completed onboarding.");
    }

    const user = await prisma.user.findFirst({
      where: {
        email: staff.email,
        saasAccountId: school.accountId,
        deletedAt: null,
      },
      select: {
        id: true,
        role: true,
      },
    });

    staffRoleSchema.parse(user?.role ?? "Teacher");

    if (!user?.id) {
      throw new Error("This staff member does not have a login account yet.");
    }

    try {
      await ensureCredentialAccount(prisma, user.id);

      const inviteLink = await sendOnboardingInvite({
        email: staff.email,
        invitedByName: actor?.name ?? null,
        roleLabel: user.role ?? "Teacher",
        schoolName: school.name,
        staffName: staff.name ?? buildPendingStaffName(staff.email),
        staffId: staff.id,
        tenantSlug,
        userId: user.id,
      });
      await syncInviteState({
        staffId: staff.id,
        status: "PENDING",
        resent: true,
      });
      if (user?.id) {
        await tryCreateStaffInvitationNotification({
          actorName: actor?.name ?? null,
          actorUserId: profile.auth?.userId ?? null,
          payload: {
            inviteLink,
            invitedByName: actor?.name ?? null,
            recipientEmail: staff.email,
            roleLabel: user.role ?? "Teacher",
            schoolName: school.name,
            staffId: staff.id,
            staffName: staff.name ?? buildPendingStaffName(staff.email),
          },
          schoolProfileId: profile.schoolId!,
          userId: user.id,
        });
        staffChanged();
        return {
          invited: true,
        };
      }
    } catch (error) {
      const message = inviteErrorMessage(error);

      if (isDevelopmentEmailConfigurationError(error)) {
        console.warn(
          "[staff-invite] Resend invite email skipped in development",
          message,
        );
        const inviteLink = await createCopyableOnboardingLink({
          email: staff.email,
          staffId: staff.id,
          tenantSlug,
          userId: user.id,
        });
        await syncInviteState({
          staffId: staff.id,
          status: "PENDING",
          resent: true,
        });
        staffChanged();
        return {
          invited: false,
          inviteError: message,
          inviteLink,
        };
      }

      console.error("[staff-invite] Failed to resend invite email", error);
      await syncInviteState({
        staffId: staff.id,
        status: "FAILED",
        error: message,
        resent: true,
      });
      throw new Error(message);
    }
  });

export const copyStaffOnboardingLinkAction = actionClient
  .schema(
    z.object({
      staffId: z.string(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const { profile, school, tenantSlug } = await getSchoolContext();

    const staff = await prisma.staffProfile.findFirst({
      where: {
        id: parsedInput.staffId,
        schoolProfileId: profile.schoolId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        onboardedAt: true,
      },
    });

    if (!staff?.email) {
      throw new Error("This staff member does not have an onboarding email.");
    }

    if (staff.onboardedAt) {
      throw new Error("This staff member has already completed onboarding.");
    }

    const user = await prisma.user.findFirst({
      where: {
        email: staff.email,
        saasAccountId: school.accountId,
        deletedAt: null,
      },
      select: {
        id: true,
        role: true,
      },
    });

    staffRoleSchema.parse(user?.role ?? "Teacher");

    if (!user?.id) {
      throw new Error("This staff member does not have a login account yet.");
    }

    await ensureCredentialAccount(prisma as any, user.id);

    const inviteLink = await createCopyableOnboardingLink({
      email: staff.email,
      staffId: staff.id,
      tenantSlug,
      userId: user.id,
    });

    await syncInviteState({
      staffId: staff.id,
      status: "PENDING",
    });
    staffChanged();

    return {
      inviteLink,
    };
  });

export const completeStaffOnboardingAction = actionClient
  .schema(completeStaffOnboardingSchema)
  .action(async ({ parsedInput }) => {
    const payload = {
      ...parsedInput,
      title: emptyToUndefined(parsedInput.title),
      phone: emptyToUndefined(parsedInput.phone),
      phone2: emptyToUndefined(parsedInput.phone2),
      address: emptyToUndefined(parsedInput.address),
    };

    const staff = await prisma.staffProfile.findFirst({
      where: {
        id: payload.staffId,
        email: payload.email,
        deletedAt: null,
      },
      select: {
        id: true,
        schoolProfile: {
          select: {
            accountId: true,
          },
        },
      },
    });

    if (!staff) {
      throw new Error("This onboarding link no longer matches a staff record.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.staffProfile.update({
        where: {
          id: staff.id,
        },
        data: {
          name: payload.name.trim(),
          title: payload.title,
          phone: payload.phone,
          phone2: payload.phone2,
          address: payload.address,
          inviteStatus: "ACTIVE",
          onboardedAt: new Date(),
          lastInviteError: null,
        },
      });

      await tx.user.updateMany({
        where: {
          email: payload.email,
          saasAccountId: staff.schoolProfile?.accountId,
          deletedAt: null,
        },
        data: {
          name: payload.name.trim(),
          emailVerified: true,
        },
      });
    });

    staffChanged();

    return {
      staffId: staff.id,
      completed: true,
    };
  });
