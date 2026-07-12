"use server";

import { createElement } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { put } from "@vercel/blob";

import { initAuth } from "@school-clerk/auth";
import { prisma } from "@school-clerk/db";
import { AdmissionSubmissionEmail } from "@school-clerk/email";
import { render } from "@school-clerk/email/render";
import {
  createBlobUploadError,
  formatTenantEmailFrom,
  getRecipient,
  resolveDashboardAppRootDomain,
} from "@school-clerk/utils";

const ACTIVE_APPLICATION_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "APPROVED"];
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
const DOCUMENT_FILE_EXTENSIONS = new Map([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
]);
const PASSPORT_PHOTO_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
const ENROLLMENT_DOCUMENT_TYPES = new Set([
  "GENERAL",
  "PASSPORT_PHOTO",
  "BIRTH_CERTIFICATE",
  "PREVIOUS_SCHOOL_REPORT",
  "OTHER",
]);

function normalizePhone(value?: FormDataEntryValue | string | null) {
  return typeof value === "string" ? value.replace(/[^\d+]/g, "").trim() : "";
}

function normalizeEmail(value?: FormDataEntryValue | string | null) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullableTextValue(formData: FormData, key: string) {
  const value = textValue(formData, key);
  return value || null;
}

function assertValidEmail(
  value: string,
  message = "A valid primary parent email address is required.",
) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error(message);
  }
}

function assertValidPhone(value: string, label: string) {
  const digitCount = value.replace(/\D/g, "").length;

  if (digitCount < 7) {
    throw new Error(`${label} must include at least 7 digits.`);
  }
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

function assertClassAgeRequirement(input: {
  classroom: any;
  link: any;
  studentDob: Date;
}) {
  if (
    input.classroom.minimumAgeMonths == null &&
    input.classroom.maximumAgeMonths == null
  ) {
    return;
  }

  const cutoffDate =
    input.classroom.ageCutoffDate ?? input.link.opensAt ?? new Date();
  const ageMonths = calculateAgeMonths(input.studentDob, cutoffDate);

  if (
    input.classroom.minimumAgeMonths != null &&
    ageMonths < input.classroom.minimumAgeMonths
  ) {
    throw new Error(
      `Student must be at least ${formatAgeMonths(
        input.classroom.minimumAgeMonths,
      )} for this classroom.`,
    );
  }

  if (
    input.classroom.maximumAgeMonths != null &&
    ageMonths > input.classroom.maximumAgeMonths
  ) {
    throw new Error(
      `Student must not be older than ${formatAgeMonths(
        input.classroom.maximumAgeMonths,
      )} for this classroom.`,
    );
  }
}

function getDashboardOrigin(subDomain: string) {
  const appRoot = resolveDashboardAppRootDomain(process.env.APP_ROOT_DOMAIN);
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  if (process.env.NODE_ENV === "production") {
    const rootDomain = appRoot.startsWith("dashboard.")
      ? appRoot.slice("dashboard.".length)
      : appRoot;

    return `${protocol}://dashboard.${subDomain}.${rootDomain}`;
  }

  return `${protocol}://${subDomain}.${appRoot}`;
}

function getSubmissionUrl(input: {
  applicationId: string;
  code: string;
  requestHeaders: Headers;
}) {
  const host =
    input.requestHeaders.get("x-forwarded-host") ??
    input.requestHeaders.get("host");

  if (!host) return null;

  const protocol =
    input.requestHeaders.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const url = new URL(`/enroll/${input.code}`, `${protocol}://${host}`);
  url.searchParams.set("submitted", input.applicationId);

  return url.toString();
}

function getAdmissionEmailFrom(schoolName?: string | null) {
  return formatTenantEmailFrom({
    defaultEmail: "admissions@school-clerk.com",
    fallbackFrom: process.env.RESEND_FROM_EMAIL,
    fallbackName: "School Clerk Admissions",
    schoolName,
  });
}

async function sendAdmissionSubmissionEmail(input: {
  applicationReference: string;
  classroomName: string;
  ctaHref?: string | null;
  documentCount: number;
  parentEmail: string;
  parentName: string;
  schoolName: string;
  studentName: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(
      `[enrollment] RESEND_API_KEY missing; submission email not sent to ${input.parentEmail}`,
    );
    return;
  }

  const html = await render(
    createElement(AdmissionSubmissionEmail, {
      applicationReference: input.applicationReference,
      classroomName: input.classroomName,
      ctaHref: input.ctaHref,
      documentCount: input.documentCount,
      parentName: input.parentName,
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
      subject: `${input.schoolName}: admission application received`,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[enrollment] submission email failed: ${errorText}`);
  }
}

function getAuthForSchoolSite() {
  const appRoot = resolveDashboardAppRootDomain(process.env.APP_ROOT_DOMAIN);
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? `https://${process.env.NEXT_PUBLIC_APP_URL}`
      : `http://${appRoot}`;

  return initAuth({
    baseUrl,
    productionUrl: `https://${process.env.NEXT_PUBLIC_APP_URL ?? "turbo.t3.gg"}`,
    secret: process.env.BETTER_AUTH_SECRET,
  });
}

async function findApplication(id: string, code: string) {
  return (prisma as any).enrollmentApplication.findFirst({
    where: {
      id,
      deletedAt: null,
      enrollmentLink: {
        code,
        deletedAt: null,
      },
    },
    include: {
      schoolProfile: true,
      parents: { where: { deletedAt: null } },
    },
  });
}

async function assertCapacity(link: any, classRoomDepartmentId: string) {
  const baseWhere = {
    enrollmentLinkId: link.id,
    status: { in: ACTIVE_APPLICATION_STATUSES },
    deletedAt: null,
  };

  if (link.capacityMode === "TOTAL") {
    const count = await (prisma as any).enrollmentApplication.count({
      where: baseWhere,
    });

    if (link.totalCapacity && count >= link.totalCapacity) {
      throw new Error("This enrollment link has reached its total capacity.");
    }

    return;
  }

  const classroom = link.classrooms.find(
    (row: any) => row.classRoomDepartmentId === classRoomDepartmentId,
  );
  const count = await (prisma as any).enrollmentApplication.count({
    where: {
      ...baseWhere,
      classRoomDepartmentId,
    },
  });

  if (classroom?.capacity && count >= classroom.capacity) {
    throw new Error("This classroom has reached its enrollment capacity.");
  }
}

async function uploadDocument(input: {
  applicationId: string;
  code: string;
  documentType: string;
  file: File;
  requirementId: string;
}) {
  const extension = DOCUMENT_FILE_EXTENSIONS.get(input.file.type);

  if (!extension) {
    throw new Error(`${input.file.name} must be a PDF, JPG, or PNG file.`);
  }

  if (
    input.documentType === "PASSPORT_PHOTO" &&
    !PASSPORT_PHOTO_MIME_TYPES.has(input.file.type)
  ) {
    throw new Error(`${input.file.name} must be a JPG or PNG passport photo.`);
  }

  if (input.file.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new Error(`${input.file.name} must be 10MB or smaller.`);
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Admission document storage is not configured.");
  }

  const key = `enrollment/${input.code}/${input.applicationId}/${input.requirementId}-${crypto.randomUUID()}.${extension}`;
  const blob = await put(key, input.file, {
    access: "public",
    addRandomSuffix: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  }).catch((error) => {
    throw createBlobUploadError("Admission document storage", error);
  });

  return {
    fileName: input.file.name,
    fileUrl: blob.url,
    storageProvider: "vercel-blob",
    storageKey: blob.pathname,
    mimeType: input.file.type,
    sizeBytes: input.file.size,
    documentType: input.documentType,
  };
}

export async function submitEnrollmentApplication(
  code: string,
  formData: FormData,
) {
  const db = prisma as any;
  const link = await db.enrollmentLink.findFirst({
    where: { code, status: "ACTIVE", deletedAt: null },
    include: {
      schoolProfile: true,
      classrooms: {
        where: { deletedAt: null },
        include: {
          classRoomDepartment: { include: { classRoom: true } },
        },
      },
      documentRequirements: {
        where: { deletedAt: null },
        orderBy: [{ sortOrder: "asc" }],
      },
    },
  });

  if (!link) {
    throw new Error("This enrollment link is no longer available.");
  }

  const now = new Date();
  if (link.opensAt && link.opensAt > now) {
    throw new Error("This enrollment link is not open yet.");
  }
  if (link.closesAt && link.closesAt < now) {
    throw new Error("This enrollment link is closed.");
  }

  const classRoomDepartmentId = textValue(formData, "classRoomDepartmentId");
  const selectedClassroom = link.classrooms.find(
    (classroom: any) =>
      classroom.classRoomDepartmentId === classRoomDepartmentId,
  );

  if (!selectedClassroom) {
    throw new Error("Select an available classroom.");
  }

  await assertCapacity(link, classRoomDepartmentId);

  const parentPhone = normalizePhone(formData.get("parentPhone"));
  if (!parentPhone) {
    throw new Error("Primary parent phone number is required.");
  }
  assertValidPhone(parentPhone, "Primary parent phone number");

  const parentPhone2 = normalizePhone(formData.get("parentPhone2"));
  if (parentPhone2) {
    assertValidPhone(parentPhone2, "Alternative parent phone number");
  }

  const studentFirstName = textValue(formData, "studentFirstName");
  const studentSurname = textValue(formData, "studentSurname");
  const studentDobText = textValue(formData, "studentDob");
  const studentDob = studentDobText ? new Date(studentDobText) : null;
  const studentGender = textValue(formData, "studentGender");
  const studentOtherName = nullableTextValue(formData, "studentOtherName");
  const parentName = textValue(formData, "parentName");
  const parentEmail = normalizeEmail(formData.get("parentEmail"));

  if (!studentFirstName || !studentSurname) {
    throw new Error("Student first name and surname are required.");
  }
  if (!studentDob || Number.isNaN(studentDob.getTime())) {
    throw new Error("A valid student date of birth is required.");
  }
  if (studentDob > new Date()) {
    throw new Error("Student date of birth cannot be in the future.");
  }
  if (studentGender !== "Male" && studentGender !== "Female") {
    throw new Error("Select a valid student gender.");
  }
  if (!parentName) {
    throw new Error("Primary parent name is required.");
  }
  assertValidEmail(parentEmail);

  assertClassAgeRequirement({
    classroom: selectedClassroom,
    link,
    studentDob,
  });

  const documentUploads: {
    documentType: string;
    file: File;
    requirementId: string;
  }[] = [];
  const applicableRequirements = getApplicableDocumentRequirements(
    link.documentRequirements,
    classRoomDepartmentId,
  );
  const applicableRequirementIds = new Set(
    applicableRequirements.map((requirement: any) => requirement.id),
  );

  for (const [key, value] of formData.entries()) {
    if (
      key.startsWith("document:") &&
      value instanceof File &&
      value.size > 0 &&
      !applicableRequirementIds.has(key.slice("document:".length))
    ) {
      throw new Error("Only upload documents for the selected classroom.");
    }
  }

  for (const requirement of applicableRequirements) {
    const file = formData.get(`document:${requirement.id}`);
    if (
      requirement.uploadRequired &&
      (!(file instanceof File) || file.size === 0)
    ) {
      throw new Error(`${requirement.label} is required.`);
    }

    if (file instanceof File && file.size > 0) {
      documentUploads.push({
        file,
        requirementId: requirement.id,
        documentType: normalizeDocumentType(
          requirement.documentType,
          requirement.label,
        ),
      });
    }
  }

  const applicationId = crypto.randomUUID();
  const uploadedDocuments: {
    fileName: string;
    fileUrl: string;
    documentType: string;
    mimeType: string;
    requirementId: string;
    sizeBytes: number;
    storageKey: string;
    storageProvider: string;
  }[] = [];

  for (const upload of documentUploads) {
    uploadedDocuments.push({
      requirementId: upload.requirementId,
      ...(await uploadDocument({
        applicationId,
        code,
        documentType: upload.documentType,
        file: upload.file,
        requirementId: upload.requirementId,
      })),
    });
  }

  const application = await db.enrollmentApplication.create({
    data: {
      id: applicationId,
      schoolProfileId: link.schoolProfileId,
      enrollmentLinkId: link.id,
      classRoomDepartmentId,
      studentFirstName,
      studentSurname,
      studentOtherName,
      studentDob,
      studentGender,
      additionalNotes: nullableTextValue(formData, "additionalNotes"),
      parents: {
        create: {
          name: parentName,
          relation: nullableTextValue(formData, "parentRelation"),
          email: parentEmail,
          phone: parentPhone,
          phone2: parentPhone2 || null,
          isPrimary: true,
        },
      },
      documents: {
        create: uploadedDocuments,
      },
    },
    select: { id: true },
  });

  const requestHeaders = new Headers(await headers());
  const studentName = [studentFirstName, studentSurname, studentOtherName]
    .filter(Boolean)
    .join(" ");

  try {
    await sendAdmissionSubmissionEmail({
      applicationReference: application.id.slice(0, 8).toUpperCase(),
      classroomName:
        classroomLabel(selectedClassroom.classRoomDepartment) || "selected class",
      ctaHref: getSubmissionUrl({
        applicationId: application.id,
        code,
        requestHeaders,
      }),
      documentCount: uploadedDocuments.length,
      parentEmail,
      parentName,
      schoolName: link.schoolProfile.name,
      studentName,
    });
  } catch (error) {
    console.error("[enrollment] submission email failed", error);
  }

  redirect(`/enroll/${code}?submitted=${application.id}`);
}

export async function setupEnrollmentParentPassword(
  code: string,
  formData: FormData,
) {
  const applicationId = textValue(formData, "applicationId");
  const email = normalizeEmail(formData.get("email"));
  const password = textValue(formData, "password");
  const application = await findApplication(applicationId, code);

  assertValidEmail(email, "A valid email address is required.");
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  if (!application) {
    throw new Error("Enrollment application not found.");
  }

  const primaryParent =
    application.parents.find((parent: any) => parent.isPrimary) ??
    application.parents[0];

  if (!primaryParent) {
    throw new Error("Primary parent information was not found.");
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      saasAccountId: application.schoolProfile.accountId,
      OR: [{ email }, { phoneNo: normalizePhone(primaryParent.phone) }],
    },
    select: {
      id: true,
      accounts: { select: { password: true } },
    },
  });

  if (existingUser?.accounts.some((account) => Boolean(account.password))) {
    await (prisma as any).enrollmentApplicationParent.update({
      where: { id: primaryParent.id },
      data: { linkedUserId: existingUser.id },
    });
    redirect(`${getDashboardOrigin(application.schoolProfile.subDomain)}/login`);
  }

  if (existingUser) {
    const token = crypto.randomUUID();
    await prisma.verification.create({
      data: {
        identifier: `reset-password:${token}`,
        value: existingUser.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });
    await (prisma as any).enrollmentApplicationParent.update({
      where: { id: primaryParent.id },
      data: { linkedUserId: existingUser.id, email },
    });

    const resetUrl = new URL(
      `${getDashboardOrigin(application.schoolProfile.subDomain)}/reset-password`,
    );
    resetUrl.searchParams.set("token", token);
    resetUrl.searchParams.set("email", email);
    redirect(resetUrl.toString());
  }

  const requestHeaders = new Headers(await headers());
  const auth = getAuthForSchoolSite();
  const signUp = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name: primaryParent.name,
      role: "Parent",
    },
    headers: requestHeaders,
  });
  const userId = signUp?.user?.id;

  if (!userId) {
    throw new Error("Could not create parent login.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      saasAccountId: application.schoolProfile.accountId,
      phoneNo: normalizePhone(primaryParent.phone),
      role: "Parent",
    },
  });

  await (prisma as any).enrollmentApplicationParent.update({
    where: { id: primaryParent.id },
    data: { linkedUserId: userId, email },
  });

  redirect(`/enroll/${code}?submitted=${applicationId}&parentReady=1`);
}
