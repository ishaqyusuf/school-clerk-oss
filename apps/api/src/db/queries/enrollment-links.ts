import type { TRPCContext } from "@api/trpc/init";
import type {
  ApproveEnrollmentApplicationInput,
  CreateOrUpdateEnrollmentLinkInput,
  GetEnrollmentApplicationsInput,
} from "@api/trpc/schemas/enrollment-links";
import { AdmissionApprovalEmail } from "@school-clerk/email";
import { render } from "@school-clerk/email/render";
import { formatTenantEmailFrom, getRecipient } from "@school-clerk/utils";
import { TRPCError } from "@trpc/server";
import { applyFeeHistoriesToStudentTermForm } from "./student-fee-application";

const ACTIVE_APPLICATION_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "APPROVED"];
const ADMIN_ROLES = new Set(["Admin", "ADMIN", "Registrar"]);
const ENROLLMENT_DOCUMENT_TYPES = new Set([
  "GENERAL",
  "PASSPORT_PHOTO",
  "BIRTH_CERTIFICATE",
  "PREVIOUS_SCHOOL_REPORT",
  "OTHER",
]);
const DEFAULT_ADMISSION_LETTER_TEMPLATE_ID = "admission-classic-v1";
const ADMISSION_LETTER_TEMPLATE_VERSION = 1;
const BUILT_IN_ADMISSION_LETTER_TEMPLATE_IDS = new Set([
  "admission-classic-v1",
  "admission-json-simple-v1",
  "admission-modern-v1",
]);

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

function inferDocumentTypeFromLabel(label?: string | null) {
  const normalized = label?.toLowerCase() ?? "";

  if (normalized.includes("passport") || normalized.includes("photo")) {
    return "PASSPORT_PHOTO";
  }

  if (normalized.includes("birth") && normalized.includes("certificate")) {
    return "BIRTH_CERTIFICATE";
  }

  if (
    normalized.includes("previous") ||
    normalized.includes("report") ||
    normalized.includes("transcript")
  ) {
    return "PREVIOUS_SCHOOL_REPORT";
  }

  return "GENERAL";
}

function normalizeDocumentType(value?: string | null, label?: string | null) {
  if (value && value !== "GENERAL" && ENROLLMENT_DOCUMENT_TYPES.has(value)) {
    return value;
  }

  return inferDocumentTypeFromLabel(label);
}

function normalizePaymentLink(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

async function resolveAdmissionLetterTemplateForSchool(
  db: any,
  schoolProfileId: string,
  templateId: string,
) {
  if (BUILT_IN_ADMISSION_LETTER_TEMPLATE_IDS.has(templateId)) {
    return {
      templateId,
      templateVersion: ADMISSION_LETTER_TEMPLATE_VERSION,
    };
  }

  const customTemplate = await db.customDocumentTemplateRequest.findFirst({
    where: {
      builtTemplateId: templateId,
      deletedAt: null,
      documentType: "ADMISSION_LETTER",
      schoolProfileId,
      status: "READY",
    },
    select: {
      builtTemplateJson: true,
      builtTemplateVersion: true,
    },
  });

  if (
    !customTemplate?.builtTemplateJson ||
    customTemplate.builtTemplateJson.documentType !== "ADMISSION_LETTER" ||
    customTemplate.builtTemplateJson.templateId !== templateId
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Select a ready admission letter template before approving.",
    });
  }

  return {
    templateId,
    templateVersion:
      customTemplate.builtTemplateVersion ??
      customTemplate.builtTemplateJson.templateVersion ??
      ADMISSION_LETTER_TEMPLATE_VERSION,
  };
}

function formatPaymentAmount(
  amount?: number | string | null,
  currency = "NGN",
) {
  if (amount == null || Number(amount) <= 0) return null;

  return new Intl.NumberFormat("en-NG", {
    currency,
    style: "currency",
  }).format(Number(amount));
}

function formatDate(value?: Date | string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(date);
}

function getAdmissionEmailFrom(schoolName?: string | null) {
  return formatTenantEmailFrom({
    defaultEmail: "admissions@school-clerk.com",
    fallbackFrom: process.env.RESEND_FROM_EMAIL,
    fallbackName: "School Clerk Admissions",
    schoolName,
  });
}

async function sendAdmissionApprovalEmail(input: {
  admissionLetterUrl?: string | null;
  classroomName: string;
  parentEmail: string;
  parentName: string;
  paymentAmount?: string | null;
  paymentDueAt?: string | null;
  paymentInstructions?: string | null;
  paymentLabel?: string | null;
  paymentLink?: string | null;
  paymentRequired: boolean;
  schoolName: string;
  studentName: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(
      `[enrollment] RESEND_API_KEY missing; approval email not sent to ${input.parentEmail}`,
    );
    return false;
  }

  const html = await render(
    AdmissionApprovalEmail({
      admissionLetterUrl: input.admissionLetterUrl,
      classroomName: input.classroomName,
      parentName: input.parentName,
      paymentAmount: input.paymentAmount,
      paymentDueAt: input.paymentDueAt,
      paymentInstructions: input.paymentInstructions,
      paymentLabel: input.paymentLabel,
      paymentLink: input.paymentLink,
      paymentRequired: input.paymentRequired,
      schoolName: input.schoolName,
      studentName: input.studentName,
    }),
  );
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getAdmissionEmailFrom(input.schoolName),
      to: [getRecipient(input.parentEmail)],
      subject: `${input.schoolName}: admission approved`,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[enrollment] approval email failed: ${errorText}`);
    return false;
  }

  return true;
}

function normalizeHost(value?: string | null) {
  return value?.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "") || "";
}

function stripDashboardHostPrefix(host: string) {
  return host.startsWith("dashboard.") ? host.slice("dashboard.".length) : host;
}

function getSchoolSiteRootDomain() {
  const explicitRoot = normalizeHost(
    process.env.SCHOOL_SITE_ROOT_DOMAIN ?? process.env.APP_ROOT_DOMAIN,
  );

  if (explicitRoot) {
    const normalizedRoot = stripDashboardHostPrefix(explicitRoot);
    return process.env.NODE_ENV === "production" ||
      normalizedRoot !== "school-clerk.localhost"
      ? normalizedRoot
      : "school-clerk-site.localhost";
  }

  const publicHost = normalizeHost(process.env.NEXT_PUBLIC_APP_URL);
  if (publicHost) return stripDashboardHostPrefix(publicHost);

  return process.env.NODE_ENV === "production"
    ? "school-clerk.com"
    : "school-clerk-site.localhost";
}

function buildPublicEnrollmentUrl(subDomain?: string | null, code?: string | null) {
  const path = code ? `/enroll/${code}` : "/enroll";
  if (!subDomain) return path;

  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  return `${protocol}://${subDomain}.${getSchoolSiteRootDomain()}${path}`;
}

function buildPublicAdmissionLetterUrl(input: {
  applicationId?: string | null;
  code?: string | null;
  subDomain?: string | null;
  templateId?: string | null;
}) {
  if (!input.subDomain || !input.code || !input.applicationId) return null;

  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const params = new URLSearchParams({
    applicationId: input.applicationId,
    code: input.code,
  });

  if (input.templateId) params.set("templateId", input.templateId);

  return `${protocol}://${input.subDomain}.${getSchoolSiteRootDomain()}/api/pdf/admission-letter?${params.toString()}`;
}

function calculateAgeMonths(dateOfBirth: Date, cutoffDate: Date) {
  let months =
    (cutoffDate.getFullYear() - dateOfBirth.getFullYear()) * 12 +
    (cutoffDate.getMonth() - dateOfBirth.getMonth());

  if (cutoffDate.getDate() < dateOfBirth.getDate()) {
    months -= 1;
  }

  return months;
}

function formatAgeMonths(months: number) {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years && remainingMonths) {
    return `${years} year${years === 1 ? "" : "s"} ${remainingMonths} month${
      remainingMonths === 1 ? "" : "s"
    }`;
  }

  if (years) return `${years} year${years === 1 ? "" : "s"}`;
  return `${months} month${months === 1 ? "" : "s"}`;
}

function getApplicableDocumentRequirements(
  requirements: any[],
  classRoomDepartmentId: string,
) {
  return requirements.filter(
    (requirement) =>
      !requirement.classRoomDepartmentId ||
      requirement.classRoomDepartmentId === classRoomDepartmentId,
  );
}

function assertClassAgeRequirement(application: any) {
  const classroomConfig = application.enrollmentLink.classrooms.find(
    (row: any) => row.classRoomDepartmentId === application.classRoomDepartmentId,
  );

  if (
    !classroomConfig?.minimumAgeMonths &&
    !classroomConfig?.maximumAgeMonths
  ) {
    return;
  }

  if (!application.studentDob) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Student date of birth is required for this classroom.",
    });
  }

  const cutoffDate =
    classroomConfig.ageCutoffDate ??
    application.enrollmentLink.opensAt ??
    application.createdAt ??
    new Date();
  const ageMonths = calculateAgeMonths(application.studentDob, cutoffDate);

  if (
    classroomConfig.minimumAgeMonths != null &&
    ageMonths < classroomConfig.minimumAgeMonths
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Student must be at least ${formatAgeMonths(
        classroomConfig.minimumAgeMonths,
      )} for this classroom.`,
    });
  }

  if (
    classroomConfig.maximumAgeMonths != null &&
    ageMonths > classroomConfig.maximumAgeMonths
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Student must not be older than ${formatAgeMonths(
        classroomConfig.maximumAgeMonths,
      )} for this classroom.`,
    });
  }
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
      schoolProfile: { select: { subDomain: true } },
      classrooms: {
        where: { deletedAt: null },
        include: {
          classRoomDepartment: {
            include: { classRoom: true },
          },
        },
      },
      documentRequirements: {
        where: { deletedAt: null },
        orderBy: [{ sortOrder: "asc" }],
      },
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
    publicUrl: buildPublicEnrollmentUrl(link.schoolProfile?.subDomain, link.code),
    status: link.status,
    showOnWebsite: link.showOnWebsite,
    capacityMode: link.capacityMode,
    totalCapacity: link.totalCapacity,
    instructions: link.instructions,
    opensAt: link.opensAt,
    closesAt: link.closesAt,
    classrooms: link.classrooms.map((row: any) => ({
      id: row.classRoomDepartmentId,
      name: classroomLabel(row.classRoomDepartment),
      capacity: row.capacity,
      minimumAgeMonths: row.minimumAgeMonths,
      maximumAgeMonths: row.maximumAgeMonths,
      ageCutoffDate: row.ageCutoffDate,
      requirementNotes: row.requirementNotes,
    })),
    documentRequirements: link.documentRequirements.map((row: any) => ({
      id: row.id,
      label: row.label,
      description: row.description,
      documentType: normalizeDocumentType(row.documentType, row.label),
      uploadRequired: row.uploadRequired,
      sortOrder: row.sortOrder,
      classRoomDepartmentId: row.classRoomDepartmentId,
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

  const selectedClassroomIds = new Set(classroomIds);
  const invalidRequirementTarget = input.documentRequirements.find(
    (requirement) =>
      requirement.classRoomDepartmentId &&
      !selectedClassroomIds.has(requirement.classRoomDepartmentId),
  );

  if (invalidRequirementTarget) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Requirement class target must be part of the selected classrooms.",
    });
  }

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
            showOnWebsite: input.showOnWebsite,
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
            showOnWebsite: input.showOnWebsite,
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
          minimumAgeMonths: classroom.minimumAgeMonths ?? null,
          maximumAgeMonths: classroom.maximumAgeMonths ?? null,
          ageCutoffDate: classroom.ageCutoffDate ?? null,
          requirementNotes: classroom.requirementNotes ?? null,
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
          documentType: normalizeDocumentType(
            requirement.documentType,
            requirement.label,
          ),
          uploadRequired: requirement.uploadRequired,
          sortOrder: requirement.sortOrder,
          classRoomDepartmentId: requirement.classRoomDepartmentId ?? null,
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
      enrollmentLink: {
        include: {
          schoolProfile: { select: { subDomain: true } },
        },
      },
      classRoomDepartment: { include: { classRoom: true } },
      parents: { where: { deletedAt: null } },
      documents: {
        where: { deletedAt: null },
        include: {
          requirement: {
            select: {
              documentType: true,
              label: true,
            },
          },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return rows.map((row: any) => {
    const primaryParent =
      row.parents.find((parent: any) => parent.isPrimary) ?? row.parents[0] ?? null;

    return {
      id: row.id,
      linkId: row.enrollmentLinkId,
      linkCode: row.enrollmentLink?.code,
      linkTitle: row.enrollmentLink?.title ?? "Enrollment link",
      admissionLetterUrl:
        row.status === "APPROVED"
          ? buildPublicAdmissionLetterUrl({
              applicationId: row.id,
              code: row.enrollmentLink?.code,
              subDomain: row.enrollmentLink?.schoolProfile?.subDomain,
              templateId:
                row.admissionLetterTemplateId ?? DEFAULT_ADMISSION_LETTER_TEMPLATE_ID,
            })
          : null,
      status: row.status,
      studentName: [row.studentFirstName, row.studentSurname, row.studentOtherName]
        .filter(Boolean)
        .join(" "),
      studentDob: row.studentDob,
      studentGender: row.studentGender,
      classroomName: classroomLabel(row.classRoomDepartment),
      primaryParent,
      documentCount: row.documents.length,
      admissionPaymentRequired: row.admissionPaymentRequired,
      admissionPaymentLabel: row.admissionPaymentLabel,
      admissionPaymentAmount: row.admissionPaymentAmount,
      admissionPaymentCurrency: row.admissionPaymentCurrency,
      admissionPaymentInstructions: row.admissionPaymentInstructions,
      admissionPaymentLink: row.admissionPaymentLink,
      admissionPaymentDueAt: row.admissionPaymentDueAt,
      admissionApprovalEmailSentAt: row.admissionApprovalEmailSentAt,
      admissionLetterTemplateId: row.admissionLetterTemplateId,
      admissionLetterTemplateVersion: row.admissionLetterTemplateVersion,
      documents: row.documents.map((document: any) => ({
        id: document.id,
        label: document.requirement?.label ?? document.fileName,
        documentType: normalizeDocumentType(
          document.documentType,
          document.requirement?.label,
        ),
        fileName: document.fileName,
        fileUrl: document.fileUrl,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        reviewStatus: document.reviewStatus,
      })),
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
  const applicableRequirements = getApplicableDocumentRequirements(
    application.enrollmentLink.documentRequirements,
    application.classRoomDepartmentId,
  );
  const missing = applicableRequirements.filter(
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
  input: ApproveEnrollmentApplicationInput,
) {
  const { schoolProfileId, userId } = requireEnrollmentAdmin(ctx);
  const paymentRequired = input.paymentRequired ?? false;
  const paymentAmount =
    paymentRequired && input.paymentAmount != null && input.paymentAmount > 0
      ? input.paymentAmount
      : null;
  const paymentCurrency = input.paymentCurrency ?? "NGN";
  const paymentInstructions = paymentRequired
    ? input.paymentInstructions?.trim() || null
    : null;
  const paymentLink = paymentRequired ? normalizePaymentLink(input.paymentLink) : null;
  const paymentLabel = paymentRequired
    ? input.paymentLabel?.trim() || "Admission payment"
    : null;
  const paymentDueAt = paymentRequired ? input.paymentDueAt ?? null : null;
  const requestedAdmissionLetterTemplateId =
    input.admissionLetterTemplateId ?? DEFAULT_ADMISSION_LETTER_TEMPLATE_ID;

  if (paymentRequired && (!paymentAmount || (!paymentInstructions && !paymentLink))) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Admission payment approval requires a positive amount and payment instructions or link.",
    });
  }

  if (!ctx.profile.sessionId || !ctx.profile.termId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "An active session and term are required before approval.",
    });
  }

  const approval = await ctx.db.$transaction(async (tx) => {
    const txDb = tx as any;
    const application = await txDb.enrollmentApplication.findFirst({
      where: {
        id: input.applicationId,
        schoolProfileId,
        deletedAt: null,
      },
      include: {
        schoolProfile: true,
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
        email: null,
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

    assertClassAgeRequirement(application);
    assertRequiredDocuments(application);
    await assertCapacity(txDb, application);

    const primaryParent =
      application.parents.find((parent: any) => parent.isPrimary) ??
      application.parents[0];

    if (!primaryParent?.email) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Primary parent email is required before sending the admission approval email.",
      });
    }

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
    const admissionLetterTemplate =
      await resolveAdmissionLetterTemplateForSchool(
        txDb,
        schoolProfileId,
        requestedAdmissionLetterTemplateId,
      );

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

    const feeApplication = await applyFeeHistoriesToStudentTermForm(tx as any, {
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
        admissionPaymentRequired: paymentRequired,
        admissionPaymentLabel: paymentLabel,
        admissionPaymentAmount: paymentAmount,
        admissionPaymentCurrency: paymentRequired ? paymentCurrency : null,
        admissionPaymentInstructions: paymentInstructions,
        admissionPaymentLink: paymentLink,
        admissionPaymentDueAt: paymentDueAt,
        admissionLetterTemplateId: admissionLetterTemplate.templateId,
        admissionLetterTemplateVersion: admissionLetterTemplate.templateVersion,
        acceptedStudentId: student.id,
        acceptedTermFormId: termForm.id,
      },
    });

    return {
      success: true,
      studentId: student.id,
      termFormId: termForm.id,
      appliedChargeCount: feeApplication.applied,
      email: {
        admissionLetterUrl: buildPublicAdmissionLetterUrl({
          applicationId: application.id,
          code: application.enrollmentLink.code,
          subDomain: application.schoolProfile.subDomain,
          templateId: admissionLetterTemplate.templateId,
        }),
        applicationId: application.id,
        classroomName: classroomLabel(application.classRoomDepartment),
        parentEmail: primaryParent.email,
        parentName: primaryParent.name,
        paymentAmount: formatPaymentAmount(paymentAmount, paymentCurrency),
        paymentDueAt: formatDate(paymentDueAt),
        paymentInstructions,
        paymentLabel,
        paymentLink,
        paymentRequired,
        schoolName: application.schoolProfile.name,
        studentName: [
          application.studentFirstName,
          application.studentSurname,
          application.studentOtherName,
        ]
          .filter(Boolean)
          .join(" "),
      },
    };
  });

  if (approval.email) {
    try {
      const sent = await sendAdmissionApprovalEmail(approval.email);

      if (sent) {
        await (ctx.db as any).enrollmentApplication.update({
          where: { id: approval.email.applicationId },
          data: { admissionApprovalEmailSentAt: new Date() },
        });
      }
    } catch (error) {
      console.error("[enrollment] approval email failed", error);
    }
  }

  return {
    success: true,
    studentId: approval.studentId,
    termFormId: approval.termFormId,
    appliedChargeCount: approval.appliedChargeCount ?? 0,
  };
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
