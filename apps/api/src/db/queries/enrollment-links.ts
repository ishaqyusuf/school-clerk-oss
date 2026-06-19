import type { TRPCContext } from "@api/trpc/init";
import type {
  CreateOrUpdateEnrollmentLinkInput,
  GetEnrollmentApplicationsInput,
} from "@api/trpc/schemas/enrollment-links";
import { TRPCError } from "@trpc/server";
import { applyFeeHistoriesToStudentTermForm } from "./student-fee-application";

const ACTIVE_APPLICATION_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "APPROVED"];
const ADMIN_ROLES = new Set(["Admin", "ADMIN", "Registrar"]);

function requireSchoolId(ctx: TRPCContext) {
  if (!ctx.profile.schoolId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "School context is required.",
    });
  }

  return ctx.profile.schoolId;
}

function requireEnrollmentAdmin(ctx: TRPCContext) {
  const schoolProfileId = requireSchoolId(ctx);
  const role = ctx.currentUser?.role;

  if (!role || !ADMIN_ROLES.has(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only admins and registrars can manage enrollment links.",
    });
  }

  return {
    schoolProfileId,
    userId: ctx.currentUser?.id ?? null,
  };
}

function enrollmentDb(ctx: TRPCContext) {
  return ctx.db as any;
}

function normalizePhone(value?: string | null) {
  return value?.replace(/[^\d+]/g, "").trim() || "";
}

function publicCode() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 16);
}

function classroomLabel(classroomDepartment: any) {
  return [
    classroomDepartment?.classRoom?.name,
    classroomDepartment?.departmentName,
  ]
    .filter(Boolean)
    .join(" ");
}

async function assertClassroomsBelongToTenant(
  ctx: TRPCContext,
  schoolProfileId: string,
  classroomDepartmentIds: string[],
) {
  const rows = await ctx.db.classRoomDepartment.findMany({
    where: {
      id: { in: classroomDepartmentIds },
      schoolProfileId,
      classRoom: {
        schoolSessionId: ctx.profile.sessionId,
      },
    },
    select: {
      id: true,
    },
  });

  if (rows.length !== new Set(classroomDepartmentIds).size) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One or more selected classrooms are not available.",
    });
  }
}

export async function listEnrollmentLinks(ctx: TRPCContext) {
  const { schoolProfileId } = requireEnrollmentAdmin(ctx);
  const db = enrollmentDb(ctx);

  const links = await db.enrollmentLink.findMany({
    where: { schoolProfileId, deletedAt: null },
    include: {
      classrooms: {
        where: { deletedAt: null },
        include: {
          classRoomDepartment: {
            include: { classRoom: true },
          },
        },
      },
      documentRequirements: { where: { deletedAt: null } },
      applications: {
        where: { deletedAt: null },
        select: { id: true, status: true },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return links.map((link: any) => ({
    id: link.id,
    title: link.title,
    code: link.code,
    status: link.status,
    capacityMode: link.capacityMode,
    totalCapacity: link.totalCapacity,
    instructions: link.instructions,
    opensAt: link.opensAt,
    closesAt: link.closesAt,
    classrooms: link.classrooms.map((row: any) => ({
      id: row.classRoomDepartmentId,
      name: classroomLabel(row.classRoomDepartment),
      capacity: row.capacity,
    })),
    documentRequirements: link.documentRequirements.map((row: any) => ({
      id: row.id,
      label: row.label,
      description: row.description,
      uploadRequired: row.uploadRequired,
      sortOrder: row.sortOrder,
    })),
    counts: {
      applications: link.applications.length,
      submitted: link.applications.filter((row: any) => row.status === "SUBMITTED")
        .length,
      approved: link.applications.filter((row: any) => row.status === "APPROVED")
        .length,
    },
  }));
}

export async function createOrUpdateEnrollmentLink(
  ctx: TRPCContext,
  input: CreateOrUpdateEnrollmentLinkInput,
) {
  const { schoolProfileId, userId } = requireEnrollmentAdmin(ctx);
  const db = enrollmentDb(ctx);
  const classroomIds = input.classrooms.map((classroom) => classroom.classRoomDepartmentId);

  await assertClassroomsBelongToTenant(ctx, schoolProfileId, classroomIds);

  if (input.id) {
    const existing = await db.enrollmentLink.findFirst({
      where: { id: input.id, schoolProfileId, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Enrollment link not found.",
      });
    }
  }

  return ctx.db.$transaction(async (tx) => {
    const txDb = tx as any;
    const link = input.id
      ? await txDb.enrollmentLink.update({
          where: { id: input.id },
          data: {
            title: input.title,
            status: input.status,
            capacityMode: input.capacityMode,
            totalCapacity: input.totalCapacity ?? null,
            instructions: input.instructions ?? null,
            opensAt: input.opensAt ?? null,
            closesAt: input.closesAt ?? null,
          },
        })
      : await txDb.enrollmentLink.create({
          data: {
            schoolProfileId,
            title: input.title,
            code: publicCode(),
            status: input.status,
            capacityMode: input.capacityMode,
            totalCapacity: input.totalCapacity ?? null,
            instructions: input.instructions ?? null,
            opensAt: input.opensAt ?? null,
            closesAt: input.closesAt ?? null,
            createdByUserId: userId,
          },
        });

    await txDb.enrollmentLinkClassroom.updateMany({
      where: { enrollmentLinkId: link.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    for (const classroom of input.classrooms) {
      await txDb.enrollmentLinkClassroom.create({
        data: {
          enrollmentLinkId: link.id,
          classRoomDepartmentId: classroom.classRoomDepartmentId,
          capacity: classroom.capacity ?? null,
        },
      });
    }

    await txDb.enrollmentLinkDocumentRequirement.updateMany({
      where: { enrollmentLinkId: link.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    for (const requirement of input.documentRequirements) {
      await txDb.enrollmentLinkDocumentRequirement.create({
        data: {
          enrollmentLinkId: link.id,
          label: requirement.label,
          description: requirement.description ?? null,
          uploadRequired: requirement.uploadRequired,
          sortOrder: requirement.sortOrder,
        },
      });
    }

    return { id: link.id, code: link.code };
  });
}

export async function setEnrollmentLinkStatus(
  ctx: TRPCContext,
  input: { id: string; status: "ACTIVE" | "PAUSED" | "ARCHIVED" },
) {
  const { schoolProfileId } = requireEnrollmentAdmin(ctx);
  const db = enrollmentDb(ctx);

  const link = await db.enrollmentLink.findFirst({
    where: { id: input.id, schoolProfileId, deletedAt: null },
    select: { id: true },
  });

  if (!link) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Enrollment link not found." });
  }

  await db.enrollmentLink.update({
    where: { id: link.id },
    data: { status: input.status },
  });

  return { success: true };
}

export async function getEnrollmentApplications(
  ctx: TRPCContext,
  input: GetEnrollmentApplicationsInput,
) {
  const { schoolProfileId } = requireEnrollmentAdmin(ctx);
  const db = enrollmentDb(ctx);

  const rows = await db.enrollmentApplication.findMany({
    where: {
      schoolProfileId,
      deletedAt: null,
      ...(input.linkId ? { enrollmentLinkId: input.linkId } : {}),
      ...(input.status ? { status: input.status } : {}),
    },
    include: {
      enrollmentLink: true,
      classRoomDepartment: { include: { classRoom: true } },
      parents: { where: { deletedAt: null } },
      documents: { where: { deletedAt: null } },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return rows.map((row: any) => {
    const primaryParent =
      row.parents.find((parent: any) => parent.isPrimary) ?? row.parents[0] ?? null;

    return {
      id: row.id,
      linkId: row.enrollmentLinkId,
      linkTitle: row.enrollmentLink?.title ?? "Enrollment link",
      status: row.status,
      studentName: [row.studentFirstName, row.studentSurname, row.studentOtherName]
        .filter(Boolean)
        .join(" "),
      studentDob: row.studentDob,
      studentGender: row.studentGender,
      classroomName: classroomLabel(row.classRoomDepartment),
      primaryParent,
      documentCount: row.documents.length,
      acceptedStudentId: row.acceptedStudentId,
      acceptedTermFormId: row.acceptedTermFormId,
      createdAt: row.createdAt,
    };
  });
}

async function assertCapacity(tx: any, application: any) {
  const activeWhere = {
    enrollmentLinkId: application.enrollmentLinkId,
    status: { in: ACTIVE_APPLICATION_STATUSES },
    deletedAt: null,
  };

  if (application.enrollmentLink.capacityMode === "TOTAL") {
    const count = await tx.enrollmentApplication.count({ where: activeWhere });
    if (
      application.enrollmentLink.totalCapacity &&
      count > application.enrollmentLink.totalCapacity
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This enrollment link has reached its total capacity.",
      });
    }
    return;
  }

  const classroomConfig = application.enrollmentLink.classrooms.find(
    (row: any) => row.classRoomDepartmentId === application.classRoomDepartmentId,
  );
  const count = await tx.enrollmentApplication.count({
    where: {
      ...activeWhere,
      classRoomDepartmentId: application.classRoomDepartmentId,
    },
  });

  if (classroomConfig?.capacity && count > classroomConfig.capacity) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This classroom has reached its enrollment capacity.",
    });
  }
}

function assertRequiredDocuments(application: any) {
  const uploadedRequirementIds = new Set(
    application.documents
      .filter((document: any) => document.requirementId)
      .map((document: any) => document.requirementId),
  );
  const missing = application.enrollmentLink.documentRequirements.filter(
    (requirement: any) =>
      requirement.uploadRequired && !uploadedRequirementIds.has(requirement.id),
  );

  if (missing.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Missing required documents: ${missing
        .map((requirement: any) => requirement.label)
        .join(", ")}`,
    });
  }
}

export async function approveEnrollmentApplication(
  ctx: TRPCContext,
  input: { applicationId: string },
) {
  const { schoolProfileId, userId } = requireEnrollmentAdmin(ctx);

  if (!ctx.profile.sessionId || !ctx.profile.termId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "An active session and term are required before approval.",
    });
  }

  return ctx.db.$transaction(async (tx) => {
    const txDb = tx as any;
    const application = await txDb.enrollmentApplication.findFirst({
      where: {
        id: input.applicationId,
        schoolProfileId,
        deletedAt: null,
      },
      include: {
        parents: { where: { deletedAt: null } },
        documents: { where: { deletedAt: null } },
        classRoomDepartment: { include: { classRoom: true } },
        enrollmentLink: {
          include: {
            classrooms: { where: { deletedAt: null } },
            documentRequirements: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!application) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Application not found." });
    }

    if (application.status === "APPROVED") {
      return {
        success: true,
        studentId: application.acceptedStudentId,
        termFormId: application.acceptedTermFormId,
      };
    }

    if (application.status === "REJECTED" || application.status === "WITHDRAWN") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This application can no longer be approved.",
      });
    }

    if (
      application.classRoomDepartment?.schoolProfileId !== schoolProfileId ||
      application.classRoomDepartment?.classRoom?.schoolSessionId !==
        ctx.profile.sessionId
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "The selected classroom is no longer available.",
      });
    }

    assertRequiredDocuments(application);
    await assertCapacity(txDb, application);

    const primaryParent =
      application.parents.find((parent: any) => parent.isPrimary) ??
      application.parents[0];

    const linkedUser = primaryParent
      ? await txDb.user.findFirst({
          where: {
            deletedAt: null,
            saasAccountId: ctx.currentUser?.saasAccountId ?? undefined,
            OR: [
              ...(primaryParent.email
                ? [{ email: primaryParent.email.toLowerCase() }]
                : []),
              { phoneNo: normalizePhone(primaryParent.phone) },
            ],
          },
          select: { id: true },
        })
      : null;

    const guardian = primaryParent
      ? await txDb.guardians.upsert({
          where: {
            name_phone_schoolProfileId: {
              name: primaryParent.name,
              phone: normalizePhone(primaryParent.phone),
              schoolProfileId,
            },
          },
          create: {
            name: primaryParent.name,
            phone: normalizePhone(primaryParent.phone),
            phone2: normalizePhone(primaryParent.phone2),
            schoolProfileId,
            userId: linkedUser?.id ?? null,
          },
          update: {
            phone2: normalizePhone(primaryParent.phone2),
            ...(linkedUser?.id ? { userId: linkedUser.id } : {}),
          },
        })
      : null;

    const student = await txDb.students.create({
      data: {
        schoolProfileId,
        name: application.studentFirstName,
        surname: application.studentSurname,
        otherName: application.studentOtherName,
        dob: application.studentDob,
        gender: application.studentGender,
        ...(guardian
          ? {
              guardians: {
                create: {
                  guardiansId: guardian.id,
                  relation: primaryParent?.relation ?? null,
                },
              },
            }
          : {}),
      },
      select: { id: true },
    });

    const sessionForm = await txDb.studentSessionForm.create({
      data: {
        schoolProfileId,
        schoolSessionId: ctx.profile.sessionId,
        studentId: student.id,
        classroomDepartmentId: application.classRoomDepartmentId,
      },
      select: { id: true },
    });

    const termForm = await txDb.studentTermForm.create({
      data: {
        schoolProfileId,
        schoolSessionId: ctx.profile.sessionId,
        sessionTermId: ctx.profile.termId,
        studentId: student.id,
        studentSessionFormId: sessionForm.id,
        classroomDepartmentId: application.classRoomDepartmentId,
      },
      select: { id: true },
    });

    await applyFeeHistoriesToStudentTermForm(tx as any, {
      schoolProfileId,
      studentId: student.id,
      studentTermFormId: termForm.id,
      schoolSessionId: ctx.profile.sessionId,
      sessionTermId: ctx.profile.termId,
      classroomDepartmentId: application.classRoomDepartmentId,
    });

    if (primaryParent) {
      await txDb.enrollmentApplicationParent.update({
        where: { id: primaryParent.id },
        data: {
          linkedGuardianId: guardian?.id ?? null,
          linkedUserId: linkedUser?.id ?? null,
        },
      });
    }

    await txDb.enrollmentApplication.update({
      where: { id: application.id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedByUserId: userId,
        acceptedStudentId: student.id,
        acceptedTermFormId: termForm.id,
      },
    });

    return { success: true, studentId: student.id, termFormId: termForm.id };
  });
}

export async function rejectEnrollmentApplication(
  ctx: TRPCContext,
  input: { applicationId: string; reason?: string | null },
) {
  const { schoolProfileId, userId } = requireEnrollmentAdmin(ctx);
  const db = enrollmentDb(ctx);

  const application = await db.enrollmentApplication.findFirst({
    where: {
      id: input.applicationId,
      schoolProfileId,
      deletedAt: null,
    },
    select: { id: true, status: true },
  });

  if (!application) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Application not found." });
  }

  if (application.status === "APPROVED") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Approved applications cannot be rejected.",
    });
  }

  await db.enrollmentApplication.update({
    where: { id: application.id },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedByUserId: userId,
      rejectionReason: input.reason ?? null,
    },
  });

  return { success: true };
}

export async function getParentOverview(ctx: TRPCContext) {
  const schoolProfileId = requireSchoolId(ctx);
  const userId = ctx.currentUser?.id;

  if (!userId || ctx.currentUser?.role !== "Parent") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only parent accounts can view the parent portal.",
    });
  }

  const guardians = await (ctx.db as any).guardians.findMany({
    where: {
      schoolProfileId,
      userId,
      deletedAt: null,
    },
    include: {
      wards: {
        where: { deletedAt: null },
        include: {
          student: {
            include: {
              termForms: {
                where: {
                  deletedAt: null,
                  schoolProfileId,
                },
                include: {
                  classroomDepartment: { include: { classRoom: true } },
                  sessionTerm: true,
                  financeCharges: true,
                },
                orderBy: [{ createdAt: "desc" }],
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  return {
    wards: guardians.flatMap((guardian: any) =>
      guardian.wards
        .filter((ward: any) => ward.student)
        .map((ward: any) => {
          const termForm = ward.student.termForms[0] ?? null;
          const charges = termForm?.financeCharges ?? [];
          const outstanding = charges.reduce((sum: number, charge: any) => {
            return sum + Number(charge.amount ?? 0) - Number(charge.amountPaid ?? 0);
          }, 0);

          return {
            id: ward.student.id,
            name: [ward.student.name, ward.student.surname, ward.student.otherName]
              .filter(Boolean)
              .join(" "),
            guardianName: guardian.name,
            classroomName: classroomLabel(termForm?.classroomDepartment),
            termName: termForm?.sessionTerm?.title ?? null,
            enrollmentStatus: termForm ? "ENROLLED" : "PENDING",
            outstanding,
            collectionStatus:
              charges.find((charge: any) => charge.collectionStatus === "NOT_COLLECTED")
                ?.collectionStatus ?? "NOT_REQUIRED",
            bookStatus:
              charges.find((charge: any) => charge.title?.toLowerCase().includes("book"))
                ?.collectionStatus ?? "NOT_REQUIRED",
            uniformStatus:
              charges.find((charge: any) =>
                charge.title?.toLowerCase().includes("uniform"),
              )?.collectionStatus ?? "NOT_REQUIRED",
          };
        }),
    ),
  };
}
